import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Ticket, AlertTriangle, CheckCircle, X, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  type: "sale" | "alert" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationWidget() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    // Subscribe to new ticket sales
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "sale":
        return <Ticket className="h-4 w-4 text-emerald-500" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
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
                      }`}
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
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground/70">
                            <Clock className="h-3 w-3" />
                            {format(notification.timestamp, "HH:mm", { locale: fr })}
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
