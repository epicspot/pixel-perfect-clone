import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentTickets } from '@/components/dashboard/RecentTickets';
import { ActiveVoyages } from '@/components/dashboard/ActiveVoyages';
import { Ticket, Bus, TrendingUp, Users } from 'lucide-react';

const Index = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats,
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Bienvenue, voici un aperçu de votre activité</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tickets"
            value={stats?.total_tickets.toLocaleString() || '—'}
            icon={Ticket}
            trend={stats?.tickets_trend}
            trendLabel="vs mois dernier"
            variant="primary"
            delay={0}
          />
          <StatCard
            title="Revenus"
            value={stats ? `${(stats.total_revenue / 1000000).toFixed(1)}M F` : '—'}
            icon={TrendingUp}
            trend={stats?.revenue_trend}
            trendLabel="vs mois dernier"
            variant="secondary"
            delay={100}
          />
          <StatCard
            title="Voyages actifs"
            value={stats?.active_voyages || '—'}
            icon={Bus}
            variant="accent"
            delay={200}
          />
          <StatCard
            title="Passagers aujourd'hui"
            value={stats?.passengers_today || '—'}
            icon={Users}
            delay={300}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTickets />
          <ActiveVoyages />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
