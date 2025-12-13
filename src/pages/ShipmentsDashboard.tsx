import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type ShipmentStatus = "pending" | "in_transit" | "delivered" | "cancelled";

interface ShipmentStats {
  pending: number;
  in_transit: number;
  delivered: number;
  cancelled: number;
  total: number;
  totalRevenue: number;
  todayCount: number;
  todayRevenue: number;
}

const statusConfig: Record<ShipmentStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { label: "En attente", color: "#f59e0b", bgColor: "bg-amber-500/10", icon: <Clock className="h-5 w-5 text-amber-500" /> },
  in_transit: { label: "En transit", color: "#3b82f6", bgColor: "bg-blue-500/10", icon: <Truck className="h-5 w-5 text-blue-500" /> },
  delivered: { label: "Livrées", color: "#22c55e", bgColor: "bg-green-500/10", icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
  cancelled: { label: "Annulées", color: "#ef4444", bgColor: "bg-red-500/10", icon: <AlertCircle className="h-5 w-5 text-red-500" /> },
};

const COLORS = ["#f59e0b", "#3b82f6", "#22c55e", "#ef4444"];

export default function ShipmentsDashboard() {
  const [stats, setStats] = useState<ShipmentStats>({
    pending: 0,
    in_transit: 0,
    delivered: 0,
    cancelled: 0,
    total: 0,
    totalRevenue: 0,
    todayCount: 0,
    todayRevenue: 0,
  });

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();

  // Fetch shipments data
  const { data: shipments, refetch } = useQuery({
    queryKey: ["shipments-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("id, status, total_amount, created_at, type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch daily stats for chart (last 7 days)
  const { data: dailyData } = useQuery({
    queryKey: ["shipments-daily-stats"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(today, 6);
      const { data, error } = await supabase
        .from("shipments")
        .select("id, status, total_amount, created_at")
        .gte("created_at", startOfDay(sevenDaysAgo).toISOString())
        .lte("created_at", todayEnd);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats when shipments change
  useEffect(() => {
    if (shipments) {
      const statusCounts: Record<ShipmentStatus, number> = {
        pending: 0,
        in_transit: 0,
        delivered: 0,
        cancelled: 0,
      };

      let totalRevenue = 0;
      let todayCount = 0;
      let todayRevenue = 0;

      shipments.forEach((s) => {
        const status = s.status as ShipmentStatus;
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++;
        }
        totalRevenue += Number(s.total_amount) || 0;

        const createdAt = new Date(s.created_at);
        if (createdAt >= new Date(todayStart) && createdAt <= new Date(todayEnd)) {
          todayCount++;
          todayRevenue += Number(s.total_amount) || 0;
        }
      });

      setStats({
        ...statusCounts,
        total: shipments.length,
        totalRevenue,
        todayCount,
        todayRevenue,
      });
    }
  }, [shipments, todayStart, todayEnd]);

  // Prepare daily chart data
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayShipments = dailyData?.filter((s) => {
      const createdAt = new Date(s.created_at);
      return createdAt >= dayStart && createdAt <= dayEnd;
    }) || [];

    chartData.push({
      date: format(date, "EEE", { locale: fr }),
      fullDate: format(date, "dd/MM", { locale: fr }),
      count: dayShipments.length,
      revenue: dayShipments.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0),
    });
  }

  // Pie chart data
  const pieData = [
    { name: "En attente", value: stats.pending, color: COLORS[0] },
    { name: "En transit", value: stats.in_transit, color: COLORS[1] },
    { name: "Livrées", value: stats.delivered, color: COLORS[2] },
    { name: "Annulées", value: stats.cancelled, color: COLORS[3] },
  ].filter((d) => d.value > 0);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("shipments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shipments",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " F CFA";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tableau de Bord Expéditions</h1>
            <p className="text-muted-foreground">Statistiques en temps réel</p>
          </div>
          <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-600 border-green-500/30">
            <span className="mr-2 h-2 w-2 rounded-full bg-green-500 inline-block"></span>
            Temps réel
          </Badge>
        </div>

        {/* Main stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(statusConfig) as ShipmentStatus[]).map((status) => (
            <Card key={status} className={`${statusConfig[status].bgColor} border-0`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {statusConfig[status].label}
                </CardTitle>
                {statusConfig[status].icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats[status]}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? ((stats[status] / stats.total) * 100).toFixed(1) : 0}% du total
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expéditions</CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Toutes périodes confondues</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aujourd'hui</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayCount}</div>
              <p className="text-xs text-green-600">{formatCurrency(stats.todayRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Revenus Totaux</CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Montant total encaissé</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Évolution sur 7 jours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "revenue" ? formatCurrency(value) : value,
                        name === "revenue" ? "Revenus" : "Expéditions",
                      ]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Expéditions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition par Statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, "Expéditions"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
