import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Ticket, AlertTriangle, CheckCircle, X, Clock, Wallet } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  type: "sale" | "alert" | "info" | "discrepancy";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  alertId?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR').format(Math.abs(value)) + ' F';
};

export function NotificationWidget() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const isManagerOrAdmin = profile?.role === 'admin' || profile?.role === 'manager';
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load existing unacknowledged discrepancy alerts on mount (for managers/admins)
  useEffect(() => {
    if (!isManagerOrAdmin) return;

    const loadExistingAlerts = async () => {
      const { data: alerts, error } = await supabase
        .from('cash_discrepancy_alerts')
        .select(`
          id,
          session_id,
          user_id,
          agency_id,
          difference,
          threshold,
          created_at,
          acknowledged_at
        `)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading alerts:', error);
        return;
      }

      if (!alerts || alerts.length === 0) return;

      // Get user names
      const userIds = [...new Set(alerts.map(a => a.user_id).filter(Boolean))];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        userMap = Object.fromEntries(profiles?.map(p => [p.id, p.name]) || []);
      }

      // Get agency names
      const agencyIds = [...new Set(alerts.map(a => a.agency_id).filter(Boolean))];
      let agencyMap: Record<number, string> = {};
      if (agencyIds.length > 0) {
        const { data: agencies } = await supabase
          .from('agencies')
          .select('id, name')
          .in('id', agencyIds);
        agencyMap = Object.fromEntries(agencies?.map(a => [a.id, a.name]) || []);
      }

      const alertNotifications: Notification[] = alerts.map(alert => ({
        id: `discrepancy-${alert.id}`,
        type: 'discrepancy',
        title: '⚠️ Écart de caisse',
        message: `${userMap[alert.user_id ?? ''] || 'Caissier'} - ${agencyMap[alert.agency_id ?? 0] || 'Agence'}: ${alert.difference > 0 ? '+' : '-'}${formatCurrency(alert.difference)} (seuil: ${formatCurrency(alert.threshold)})`,
        timestamp: new Date(alert.created_at),
        read: false,
        alertId: alert.id,
      }));

      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newAlerts = alertNotifications.filter(a => !existingIds.has(a.id));
        return [...newAlerts, ...prev].slice(0, 50);
      });
    };

    loadExistingAlerts();
  }, [isManagerOrAdmin]);

  useEffect(() => {
    // Subscribe to new ticket sales
    const ticketChannel = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          const newTicket = payload.new as any;
          const notification: Notification = {
            id: `ticket-${newTicket.id}-${Date.now()}`,
            type: "sale",
            title: "Nouvelle vente",
            message: `Ticket vendu à ${newTicket.customer_name || "Client"} - ${new Intl.NumberFormat("fr-FR").format(newTicket.total_amount || 0)} F CFA`,
            timestamp: new Date(),
            read: false,
          };
          setNotifications((prev) => [notification, ...prev].slice(0, 50));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          const updatedTicket = payload.new as any;
          if (updatedTicket.status === "cancelled" || updatedTicket.status === "refunded") {
            const notification: Notification = {
              id: `ticket-cancel-${updatedTicket.id}-${Date.now()}`,
              type: "alert",
              title: updatedTicket.status === "cancelled" ? "Ticket annulé" : "Remboursement",
              message: `Ticket #${updatedTicket.ticket_number || updatedTicket.id} ${updatedTicket.status === "cancelled" ? "annulé" : "remboursé"}`,
              timestamp: new Date(),
              read: false,
            };
            setNotifications((prev) => [notification, ...prev].slice(0, 50));
          }
        }
      )
      .subscribe();

    // Subscribe to cash discrepancy alerts (for managers/admins)
    let alertChannel: ReturnType<typeof supabase.channel> | null = null;
    
    if (isManagerOrAdmin) {
      alertChannel = supabase
        .channel("discrepancy-alerts-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "cash_discrepancy_alerts",
          },
          async (payload) => {
            const alert = payload.new as any;
            
            // Fetch user name
            let userName = 'Caissier';
            if (alert.user_id) {
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', alert.user_id)
                .maybeSingle();
              if (userProfile) userName = userProfile.name;
            }

            // Fetch agency name
            let agencyName = 'Agence';
            if (alert.agency_id) {
              const { data: agency } = await supabase
                .from('agencies')
                .select('name')
                .eq('id', alert.agency_id)
                .maybeSingle();
              if (agency) agencyName = agency.name;
            }

            const notification: Notification = {
              id: `discrepancy-${alert.id}`,
              type: "discrepancy",
              title: "⚠️ Écart de caisse",
              message: `${userName} - ${agencyName}: ${alert.difference > 0 ? '+' : '-'}${formatCurrency(alert.difference)} (seuil: ${formatCurrency(alert.threshold)})`,
              timestamp: new Date(),
              read: false,
              alertId: alert.id,
            };
            setNotifications((prev) => [notification, ...prev].slice(0, 50));
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(ticketChannel);
      if (alertChannel) supabase.removeChannel(alertChannel);
    };
  }, [isManagerOrAdmin]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const acknowledgeAlert = async (notification: Notification) => {
    if (!notification.alertId) return;
    
    const { error } = await supabase
      .from('cash_discrepancy_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: profile?.id,
      })
      .eq('id', notification.alertId);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "sale":
        return <Ticket className="h-4 w-4 text-emerald-500" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "discrepancy":
        return <Wallet className="h-4 w-4 text-destructive" />;
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        className="relative bg-card/50 border-border/50 hover:bg-card"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-xs animate-pulse"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={markAllAsRead}
                >
                  Tout marquer lu
                </Button>
              )}
            </div>

            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm">Aucune notification</p>
                  <p className="text-xs mt-1">Les nouvelles ventes apparaîtront ici</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-muted/50 transition-colors ${
                        !notification.read ? "bg-primary/5" : ""
                      } ${notification.type === 'discrepancy' ? 'bg-destructive/5' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                              {notification.title}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0 opacity-50 hover:opacity-100"
                              onClick={() => clearNotification(notification.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                              <Clock className="h-3 w-3" />
                              {format(notification.timestamp, "HH:mm", { locale: fr })}
                            </div>
                            {notification.type === 'discrepancy' && notification.alertId && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => acknowledgeAlert(notification)}
                              >
                                Acquitter
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}