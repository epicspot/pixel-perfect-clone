import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Wrench, 
  Fuel, 
  DollarSign, 
  Ticket, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bus
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface RoleSpecificStatsProps {
  agencyId?: number;
}

export const RoleSpecificStats: React.FC<RoleSpecificStatsProps> = ({ agencyId }) => {
  const { profile, user } = useAuth();
  const role = profile?.role;
  const userAgencyId = profile?.agency_id;

  // Get date range for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  const today = now.toISOString().split('T')[0];

  // Mechanic stats: maintenance and fuel costs
  const { data: mechanicStats, isLoading: loadingMechanic } = useQuery({
    queryKey: ['mechanic-stats', startOfMonth, endOfMonth],
    queryFn: async () => {
      const effectiveAgencyId = agencyId || userAgencyId;
      
      // Maintenance costs
      let maintenanceQuery = supabase
        .from('maintenance_orders')
        .select('total_cost, status')
        .gte('opened_at', startOfMonth)
        .lte('opened_at', endOfMonth);
      
      if (effectiveAgencyId) {
        maintenanceQuery = maintenanceQuery.eq('agency_id', effectiveAgencyId);
      }
      
      const { data: maintenance } = await maintenanceQuery;
      
      // Fuel costs
      let fuelQuery = supabase
        .from('fuel_entries')
        .select('total_amount, liters')
        .gte('filled_at', startOfMonth)
        .lte('filled_at', endOfMonth);
      
      if (effectiveAgencyId) {
        fuelQuery = fuelQuery.eq('agency_id', effectiveAgencyId);
      }
      
      const { data: fuel } = await fuelQuery;

      // Open maintenance orders count
      let openMaintenanceQuery = supabase
        .from('maintenance_orders')
        .select('id', { count: 'exact' })
        .in('status', ['open', 'in_progress']);
      
      if (effectiveAgencyId) {
        openMaintenanceQuery = openMaintenanceQuery.eq('agency_id', effectiveAgencyId);
      }
      
      const { count: openMaintenanceCount } = await openMaintenanceQuery;

      const maintenanceCost = maintenance?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;
      const fuelCost = fuel?.reduce((sum, f) => sum + (f.total_amount || 0), 0) || 0;
      const totalLiters = fuel?.reduce((sum, f) => sum + (f.liters || 0), 0) || 0;
      const closedCount = maintenance?.filter(m => m.status === 'closed').length || 0;
      const totalCount = maintenance?.length || 0;

      return {
        maintenanceCost,
        fuelCost,
        totalLiters,
        openMaintenanceCount: openMaintenanceCount || 0,
        closedCount,
        totalCount,
        totalCost: maintenanceCost + fuelCost
      };
    },
    enabled: role === 'mechanic' || role === 'admin',
  });

  // Cashier stats: personal sales today
  const { data: cashierStats, isLoading: loadingCashier } = useQuery({
    queryKey: ['cashier-stats', today, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Today's personal sales
      const { data: tickets } = await supabase
        .from('tickets')
        .select('total_amount, status')
        .eq('created_by', user.id)
        .gte('sold_at', today + 'T00:00:00')
        .lte('sold_at', today + 'T23:59:59');

      // Active session
      const { data: session } = await supabase
        .from('counter_sessions')
        .select('id, opening_cash, opened_at')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .single();

      const todaySales = tickets?.filter(t => t.status === 'paid').reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
      const ticketCount = tickets?.filter(t => t.status === 'paid').length || 0;

      return {
        todaySales,
        ticketCount,
        hasActiveSession: !!session,
        sessionOpenedAt: session?.opened_at
      };
    },
    enabled: role === 'cashier',
  });

  // Accountant stats: expenses and balance
  const { data: accountantStats, isLoading: loadingAccountant } = useQuery({
    queryKey: ['accountant-stats', startOfMonth, endOfMonth, agencyId],
    queryFn: async () => {
      const effectiveAgencyId = agencyId || userAgencyId;
      
      // Expenses
      let expensesQuery = supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', startOfMonth.split('T')[0])
        .lte('expense_date', endOfMonth.split('T')[0]);
      
      if (effectiveAgencyId) {
        expensesQuery = expensesQuery.eq('agency_id', effectiveAgencyId);
      }
      
      const { data: expenses } = await expensesQuery;

      // Revenue from tickets
      let ticketsQuery = supabase
        .from('tickets')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('sold_at', startOfMonth)
        .lte('sold_at', endOfMonth);
      
      if (effectiveAgencyId) {
        ticketsQuery = ticketsQuery.eq('agency_id', effectiveAgencyId);
      }
      
      const { data: tickets } = await ticketsQuery;

      // Maintenance costs
      let maintenanceQuery = supabase
        .from('maintenance_orders')
        .select('total_cost')
        .gte('opened_at', startOfMonth)
        .lte('opened_at', endOfMonth);
      
      if (effectiveAgencyId) {
        maintenanceQuery = maintenanceQuery.eq('agency_id', effectiveAgencyId);
      }
      
      const { data: maintenance } = await maintenanceQuery;

      // Fuel costs
      let fuelQuery = supabase
        .from('fuel_entries')
        .select('total_amount')
        .gte('filled_at', startOfMonth)
        .lte('filled_at', endOfMonth);
      
      if (effectiveAgencyId) {
        fuelQuery = fuelQuery.eq('agency_id', effectiveAgencyId);
      }
      
      const { data: fuel } = await fuelQuery;

      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalRevenue = tickets?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
      const maintenanceCost = maintenance?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;
      const fuelCost = fuel?.reduce((sum, f) => sum + (f.total_amount || 0), 0) || 0;
      
      const totalCosts = totalExpenses + maintenanceCost + fuelCost;
      const balance = totalRevenue - totalCosts;

      return {
        totalRevenue,
        totalExpenses,
        maintenanceCost,
        fuelCost,
        totalCosts,
        balance
      };
    },
    enabled: role === 'accountant' || role === 'admin',
  });

  // Manager stats: agency trips and occupancy
  const { data: managerStats, isLoading: loadingManager } = useQuery({
    queryKey: ['manager-stats', today, agencyId, userAgencyId],
    queryFn: async () => {
      const effectiveAgencyId = agencyId || userAgencyId;
      
      // Today's trips
      const { data: trips } = await supabase
        .from('trips')
        .select(`
          id, 
          status, 
          capacity,
          route:routes!inner(departure_agency_id)
        `)
        .gte('departure_datetime', today + 'T00:00:00')
        .lte('departure_datetime', today + 'T23:59:59');

      const filteredTrips = effectiveAgencyId 
        ? trips?.filter((t: any) => t.route?.departure_agency_id === effectiveAgencyId)
        : trips;

      // Get ticket counts for each trip
      const tripIds = filteredTrips?.map(t => t.id) || [];
      const { data: tickets } = await supabase
        .from('tickets')
        .select('trip_id')
        .in('trip_id', tripIds.length > 0 ? tripIds : [-1])
        .eq('status', 'paid');

      const ticketsByTrip = tickets?.reduce((acc: Record<number, number>, t) => {
        acc[t.trip_id] = (acc[t.trip_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const totalTrips = filteredTrips?.length || 0;
      const departedTrips = filteredTrips?.filter(t => ['departed', 'arrived'].includes(t.status)).length || 0;
      const totalCapacity = filteredTrips?.reduce((sum, t) => sum + (t.capacity || 0), 0) || 0;
      const totalSold = Object.values(ticketsByTrip).reduce((sum: number, count: number) => sum + count, 0);
      const occupancyRate = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;

      return {
        totalTrips,
        departedTrips,
        totalCapacity,
        totalSold,
        occupancyRate
      };
    },
    enabled: role === 'manager',
  });

  // Render based on role
  if (role === 'mechanic') {
    if (loadingMechanic) return <StatsSkeleton />;
    if (!mechanicStats) return null;

    return (
      <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Statistiques Maintenance</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Ce mois</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Wrench}
            label="Coûts maintenance"
            value={formatCurrency(mechanicStats.maintenanceCost)}
            color="from-orange-500 to-amber-600"
          />
          <StatCard
            icon={Fuel}
            label="Coûts carburant"
            value={formatCurrency(mechanicStats.fuelCost)}
            color="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={AlertTriangle}
            label="Ordres en cours"
            value={mechanicStats.openMaintenanceCount.toString()}
            color="from-red-500 to-rose-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Ordres clôturés"
            value={`${mechanicStats.closedCount}/${mechanicStats.totalCount}`}
            color="from-blue-500 to-indigo-600"
          />
        </div>
        <Card className="mt-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Coût total exploitation</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(mechanicStats.totalCost)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {mechanicStats.totalLiters.toFixed(0)} litres de carburant consommés
          </p>
        </Card>
      </div>
    );
  }

  if (role === 'cashier') {
    if (loadingCashier) return <StatsSkeleton />;
    if (!cashierStats) return null;

    return (
      <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Mes Ventes du Jour</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            icon={DollarSign}
            label="Ventes totales"
            value={formatCurrency(cashierStats.todaySales)}
            color="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={Ticket}
            label="Tickets vendus"
            value={cashierStats.ticketCount.toString()}
            color="from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={cashierStats.hasActiveSession ? CheckCircle : AlertTriangle}
            label="Session"
            value={cashierStats.hasActiveSession ? 'Active' : 'Fermée'}
            color={cashierStats.hasActiveSession ? 'from-emerald-500 to-green-600' : 'from-red-500 to-rose-600'}
          />
        </div>
        {cashierStats.hasActiveSession && cashierStats.sessionOpenedAt && (
          <Card className="mt-3 p-4 bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Session ouverte depuis {new Date(cashierStats.sessionOpenedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (role === 'accountant') {
    if (loadingAccountant) return <StatsSkeleton />;
    if (!accountantStats) return null;

    const isPositive = accountantStats.balance >= 0;

    return (
      <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Aperçu Financier</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Ce mois</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={TrendingUp}
            label="Recettes"
            value={formatCurrency(accountantStats.totalRevenue)}
            color="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={TrendingDown}
            label="Dépenses"
            value={formatCurrency(accountantStats.totalExpenses)}
            color="from-red-500 to-rose-600"
          />
          <StatCard
            icon={Wrench}
            label="Maintenance"
            value={formatCurrency(accountantStats.maintenanceCost)}
            color="from-orange-500 to-amber-600"
          />
          <StatCard
            icon={Fuel}
            label="Carburant"
            value={formatCurrency(accountantStats.fuelCost)}
            color="from-blue-500 to-indigo-600"
          />
        </div>
        <Card className={`mt-3 p-4 border ${isPositive ? 'bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border-emerald-500/20' : 'bg-gradient-to-r from-red-500/5 to-red-500/10 border-red-500/20'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Résultat net</span>
            <span className={`text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{formatCurrency(accountantStats.balance)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total charges: {formatCurrency(accountantStats.totalCosts)}
          </p>
        </Card>
      </div>
    );
  }

  if (role === 'manager') {
    if (loadingManager) return <StatsSkeleton />;
    if (!managerStats) return null;

    return (
      <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-2 mb-4">
          <Bus className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Voyages du Jour</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Bus}
            label="Voyages prévus"
            value={managerStats.totalTrips.toString()}
            color="from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Partis/Arrivés"
            value={managerStats.departedTrips.toString()}
            color="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={Ticket}
            label="Places vendues"
            value={`${managerStats.totalSold}/${managerStats.totalCapacity}`}
            color="from-orange-500 to-amber-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Taux remplissage"
            value={`${managerStats.occupancyRate.toFixed(0)}%`}
            color={managerStats.occupancyRate >= 70 ? 'from-emerald-500 to-green-600' : managerStats.occupancyRate >= 40 ? 'from-orange-500 to-amber-600' : 'from-red-500 to-rose-600'}
          />
        </div>
      </div>
    );
  }

  // Admin sees accountant stats by default
  if (role === 'admin' && accountantStats) {
    if (loadingAccountant) return <StatsSkeleton />;

    const isPositive = accountantStats.balance >= 0;

    return (
      <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Résumé Financier</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Ce mois</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={TrendingUp}
            label="Recettes"
            value={formatCurrency(accountantStats.totalRevenue)}
            color="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={TrendingDown}
            label="Total charges"
            value={formatCurrency(accountantStats.totalCosts)}
            color="from-red-500 to-rose-600"
          />
          <StatCard
            icon={Wrench}
            label="Maintenance"
            value={formatCurrency(accountantStats.maintenanceCost)}
            color="from-orange-500 to-amber-600"
          />
          <StatCard
            icon={Fuel}
            label="Carburant"
            value={formatCurrency(accountantStats.fuelCost)}
            color="from-blue-500 to-indigo-600"
          />
        </div>
        <Card className={`mt-3 p-4 border ${isPositive ? 'bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border-emerald-500/20' : 'bg-gradient-to-r from-red-500/5 to-red-500/10 border-red-500/20'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Résultat net</span>
            <span className={`text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{formatCurrency(accountantStats.balance)}
            </span>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

// Small stat card component
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color }) => (
  <Card className="relative overflow-hidden p-4 bg-card border-border/50 group hover:shadow-md transition-all">
    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${color} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity`} />
    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2 shadow-sm`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-lg font-bold text-foreground">{value}</p>
  </Card>
);

// Loading skeleton
const StatsSkeleton = () => (
  <div className="animate-fade-in">
    <Skeleton className="h-6 w-48 mb-4" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="w-8 h-8 rounded-lg mb-2" />
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-6 w-24" />
        </Card>
      ))}
    </div>
  </div>
);

export default RoleSpecificStats;
