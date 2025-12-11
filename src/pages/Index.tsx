import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Ticket, Bus, Users } from 'lucide-react';
import { AgencyFilter } from '@/components/filters/AgencyFilter';

type PeriodType = 'today' | 'week' | 'month';

const Index = () => {
  const { profile } = useAuth();
  const [period, setPeriod] = React.useState<PeriodType>('month');
  const [selectedAgencyId, setSelectedAgencyId] = React.useState<string>('');

  const getDateRange = React.useCallback((p: PeriodType) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (p === 'today') {
      return { from: today, to: today };
    }
    if (p === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo.toISOString().split('T')[0], to: today };
    }
    // month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: startOfMonth.toISOString().split('T')[0], to: endOfMonth.toISOString().split('T')[0] };
  }, []);

  const dateRange = React.useMemo(() => getDateRange(period), [period, getDateRange]);

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats', dateRange.from, dateRange.to, selectedAgencyId],
    queryFn: () => api.getDashboardStats({ 
      from: dateRange.from, 
      to: dateRange.to,
      agency_id: selectedAgencyId ? Number(selectedAgencyId) : undefined
    }),
  });

  const isAdmin = profile?.role === 'admin';

  const isAdminView = ['admin', 'manager', 'accountant'].includes(profile?.role ?? '');

  // Subtitle based on context
  const getSubtitle = () => {
    if (!isAdminView) return 'Vue simplifiée – ventes et voyages';
    if (!isAdmin && profile?.agency_name) return `Données de ${profile.agency_name}`;
    if (selectedAgencyId) return 'Vue filtrée par agence';
    return 'Vue globale de toutes les agences';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">
              {getSubtitle()}
            </p>
          </div>
        </div>

        {/* Agency Filter for Admin */}
        {isAdmin && (
          <div className="flex justify-end">
            <AgencyFilter
              value={selectedAgencyId}
              onChange={setSelectedAgencyId}
              className="w-48"
            />
          </div>
        )}

        {/* KPIs + Period Selector */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Indicateurs clés</h2>
            <div className="flex rounded-full bg-card shadow-sm border border-border text-xs">
              <PeriodChip label="Aujourd'hui" value="today" current={period} onClick={setPeriod} />
              <PeriodChip label="Semaine" value="week" current={period} onClick={setPeriod} />
              <PeriodChip label="Mois" value="month" current={period} onClick={setPeriod} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm">
              Erreur lors du chargement des statistiques. Vérifiez votre connexion.
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl shadow-sm border border-border p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Recettes"
                value={formatCurrency(stats.period.sales_amount)}
                badge={stats.today.sales_amount > 0 ? `+${formatCurrency(stats.today.sales_amount)} aujourd'hui` : undefined}
                icon={TrendingUp}
                iconBg="bg-green-50 dark:bg-green-900/20"
                iconColor="text-green-600 dark:text-green-400"
              />
              <KpiCard
                label="Tickets vendus"
                value={stats.period.tickets_count.toString()}
                badge={stats.today.tickets_count > 0 ? `+${stats.today.tickets_count} aujourd'hui` : undefined}
                icon={Ticket}
                iconBg="bg-blue-50 dark:bg-blue-900/20"
                iconColor="text-blue-600 dark:text-blue-400"
              />
              <KpiCard
                label="Voyages"
                value={stats.period.trips_count.toString()}
                badge={stats.today.trips_count > 0 ? `${stats.today.trips_count} aujourd'hui` : undefined}
                icon={Bus}
                iconBg="bg-orange-50 dark:bg-orange-900/20"
                iconColor="text-orange-600 dark:text-orange-400"
              />
              <KpiCard
                label="Agences actives"
                value={stats.per_agency.length.toString()}
                icon={Users}
                iconBg="bg-purple-50 dark:bg-purple-900/20"
                iconColor="text-purple-600 dark:text-purple-400"
              />
            </div>
          )}
        </section>

        {/* Charts + Recent Sales */}
        {stats && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-card rounded-2xl shadow-sm border border-border p-4 md:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Évolution des recettes
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {stats.daily_sales.length} jour(s) de données
                  </p>
                </div>
              </div>

              {stats.daily_sales.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée sur la période.
                </div>
              ) : (
                <div className="flex-1 flex items-end gap-2 md:gap-3 h-48">
                  {stats.daily_sales.map((day, idx) => {
                    const max = Math.max(...stats.daily_sales.map(d => d.total_amount));
                    const ratio = max > 0 ? day.total_amount / max : 0;
                    const height = Math.max(10, ratio * 100);
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group">
                        <div 
                          className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-xl transition-all duration-300 hover:from-primary hover:to-primary/80 cursor-pointer relative"
                          style={{ height: `${height}%` }}
                          title={`${formatDate(day.date)}: ${formatCurrency(day.total_amount)}`}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {formatCurrency(day.total_amount)}
                          </div>
                        </div>
                        <span className="mt-2 text-[10px] text-muted-foreground">
                          {getDayLabel(day.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Sales */}
            <div className="bg-card rounded-2xl shadow-sm border border-border p-4 md:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-card-foreground">Dernières ventes</h3>
                <span className="text-xs text-muted-foreground">{stats.recent_tickets.length}</span>
              </div>

              <div className="overflow-x-auto -mx-4 md:mx-0 flex-1">
                <table className="min-w-full text-xs">
                  <thead className="text-[11px] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Heure</th>
                      <th className="px-4 py-2 text-left">Client</th>
                      <th className="px-4 py-2 text-right">Montant</th>
                      <th className="px-4 py-2 text-left">Paiement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_tickets.slice(0, 6).map((t) => (
                      <tr key={t.id} className="border-t border-border/50 hover:bg-muted/50">
                        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                          {t.sold_at ? formatTime(t.sold_at) : '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap truncate max-w-[100px]">
                          {t.customer_name || 'Anonyme'}
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap font-medium">
                          {formatCurrency(t.price)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <PaymentBadge method={t.payment_method} />
                        </td>
                      </tr>
                    ))}
                    {stats.recent_tickets.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                          Aucune vente récente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Per Agency Table */}
        {stats && stats.per_agency.length > 0 && (
          <section className="bg-card rounded-2xl shadow-sm border border-border p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-card-foreground">Ventes par agence</h3>
              <span className="text-xs text-muted-foreground">{stats.per_agency.length} agence(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left">Agence</th>
                    <th className="px-4 py-2 text-right">Tickets</th>
                    <th className="px-4 py-2 text-right">Montant</th>
                    <th className="px-4 py-2 text-right">Part</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.per_agency.map((row) => {
                    const share = stats.period.sales_amount > 0 
                      ? (row.total_amount / stats.period.sales_amount * 100).toFixed(0)
                      : 0;
                    return (
                      <tr key={row.agency_id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{row.agency_name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.tickets_count}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.total_amount)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                            {share}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

// KPI Card Component
interface KpiCardProps {
  label: string;
  value: string;
  badge?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, badge, icon: Icon, iconBg, iconColor }) => (
  <div className="bg-card rounded-2xl shadow-sm border border-border p-4 flex flex-col justify-between animate-fade-in">
    <div className="flex items-start justify-between">
      <div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="mt-1 text-xl md:text-2xl font-semibold text-card-foreground">{value}</div>
      </div>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
    {badge && (
      <span className="mt-3 self-start text-[11px] px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">
        {badge}
      </span>
    )}
  </div>
);

// Period Chip Component
interface PeriodChipProps {
  label: string;
  value: PeriodType;
  current: PeriodType;
  onClick: (v: PeriodType) => void;
}

const PeriodChip: React.FC<PeriodChipProps> = ({ label, value, current, onClick }) => {
  const isActive = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1.5 rounded-full transition-colors ${
        isActive
          ? 'bg-foreground text-background font-medium'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  );
};

// Payment Badge Component
const PaymentBadge: React.FC<{ method: string }> = ({ method }) => {
  const styles: Record<string, string> = {
    cash: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800',
    'mobile money': 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800',
    carte: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800',
  };
  
  const style = styles[method?.toLowerCase()] || 'bg-muted text-muted-foreground border-border';
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${style}`}>
      {method || 'Cash'}
    </span>
  );
};

// Helpers
function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function getDayLabel(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 2);
  } catch {
    return dateStr;
  }
}

export default Index;
