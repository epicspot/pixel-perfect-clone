import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentTickets } from '@/components/dashboard/RecentTickets';
import { AgencyBreakdown } from '@/components/dashboard/AgencyBreakdown';
import { Ticket, Bus, TrendingUp, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user } = useAuth();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M F`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K F`;
    }
    return `${value.toLocaleString()} F`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue {user?.name || ''}, voici un aperçu de votre activité
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
            Erreur lors du chargement des statistiques. Vérifiez votre connexion à l'API.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Ventes du jour"
              value={formatCurrency(stats?.today.sales_amount || 0)}
              icon={TrendingUp}
              variant="primary"
              delay={0}
            />
            <StatCard
              title="Tickets vendus (jour)"
              value={stats?.today.tickets_count || 0}
              icon={Ticket}
              variant="secondary"
              delay={100}
            />
            <StatCard
              title="Voyages du jour"
              value={stats?.today.trips_count || 0}
              icon={Bus}
              variant="accent"
              delay={200}
            />
            <StatCard
              title="Ventes du mois"
              value={formatCurrency(stats?.month.sales_amount || 0)}
              icon={Users}
              delay={300}
            />
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTickets tickets={stats?.recent_tickets} isLoading={isLoading} />
          <AgencyBreakdown agencies={stats?.per_agency} isLoading={isLoading} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
