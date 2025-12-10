import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Index = () => {
  const { user } = useAuth();
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [appliedFrom, setAppliedFrom] = React.useState<string | undefined>();
  const [appliedTo, setAppliedTo] = React.useState<string | undefined>();

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats', appliedFrom, appliedTo],
    queryFn: () => api.getDashboardStats({ from: appliedFrom, to: appliedTo }),
  });

  // Initialize date filters from API response
  React.useEffect(() => {
    if (stats && !fromDate && !toDate) {
      setFromDate(stats.period.start);
      setToDate(stats.period.end);
    }
  }, [stats, fromDate, toDate]);

  const handleApplyFilter = () => {
    if (fromDate && toDate) {
      setAppliedFrom(fromDate);
      setAppliedTo(toDate);
    }
  };

  const isAdminView = ['admin', 'manager', 'accountant'].includes(user?.role ?? '');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdminView ? 'Vue globale des ventes et des voyages' : 'Vue simplifiée – ventes et voyages'}
          </p>
        </div>

        {/* Date Filter */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1">Du</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1">Au</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button
            onClick={handleApplyFilter}
            disabled={isLoading || !fromDate || !toDate}
            size="sm"
          >
            Appliquer
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm">
            Erreur lors du chargement des statistiques. Vérifiez votre connexion à l'API.
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <>
            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <DashboardCard
                title="Ventes du jour"
                value={formatCurrency(stats.today.sales_amount)}
                subtitle={`${stats.today.tickets_count} ticket(s) vendus`}
              />
              <DashboardCard
                title="Voyages du jour"
                value={stats.today.trips_count.toString()}
                subtitle="Voyages programmés aujourd'hui"
              />
              <DashboardCard
                title="Ventes sur la période"
                value={formatCurrency(stats.period.sales_amount)}
                subtitle={`${stats.period.tickets_count} tickets du ${formatDate(stats.period.start)} au ${formatDate(stats.period.end)}`}
              />
              <DashboardCard
                title="Voyages sur la période"
                value={stats.period.trips_count.toString()}
                subtitle={`${formatDate(stats.period.start)} → ${formatDate(stats.period.end)}`}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MiniBarChart
                title="Évolution des ventes (F CFA)"
                data={stats.daily_sales}
                getValue={(d) => d.total_amount}
              />
              <MiniBarChart
                title="Évolution des voyages"
                data={stats.daily_trips}
                getValue={(d) => d.trips_count}
              />
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Per Agency */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-card-foreground">Ventes par agence</h2>
                  <span className="text-xs text-muted-foreground">{stats.per_agency.length} agence(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-xs text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Agence</th>
                        <th className="px-3 py-2 text-right font-medium">Tickets</th>
                        <th className="px-3 py-2 text-right font-medium">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.per_agency.map((row) => (
                        <tr key={row.agency_id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="px-3 py-2 text-card-foreground">{row.agency_name}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{row.tickets_count}</td>
                          <td className="px-3 py-2 text-right font-medium text-card-foreground">{formatCurrency(row.total_amount)}</td>
                        </tr>
                      ))}
                      {stats.per_agency.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                            Aucune vente sur la période.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Tickets */}
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-card-foreground">Dernières ventes</h2>
                  <span className="text-xs text-muted-foreground">{stats.recent_tickets.length} opérations</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-xs text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Agence</th>
                        <th className="px-3 py-2 text-left font-medium">Client</th>
                        <th className="px-3 py-2 text-right font-medium">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_tickets.map((t) => (
                        <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="px-3 py-2 text-muted-foreground">{t.sold_at || '-'}</td>
                          <td className="px-3 py-2 text-card-foreground">{t.agency_name}</td>
                          <td className="px-3 py-2 text-card-foreground">{t.customer_name || '-'}</td>
                          <td className="px-3 py-2 text-right font-medium text-card-foreground">{formatCurrency(t.price)}</td>
                        </tr>
                      ))}
                      {stats.recent_tickets.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                            Aucune vente récente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Dashboard Card Component
interface DashboardCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, subtitle }) => (
  <div className="bg-card rounded-xl border border-border p-4 flex flex-col justify-between">
    <div>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-bold text-card-foreground">{value}</p>
    </div>
    {subtitle && <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>}
  </div>
);

// Mini Bar Chart Component
interface MiniBarChartProps<T> {
  title: string;
  data: T[];
  getValue: (item: T) => number;
}

function MiniBarChart<T extends { date: string }>({ title, data, getValue }: MiniBarChartProps<T>) {
  const max = React.useMemo(() => Math.max(0, ...data.map((d) => getValue(d))), [data, getValue]);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{data.length} jour(s)</span>
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">Aucune donnée sur la période.</p>
      ) : (
        <div className="h-32 flex items-end gap-[3px] overflow-x-auto">
          {data.map((point, index) => {
            const value = getValue(point);
            const ratio = max > 0 ? value / max : 0;
            const height = 20 + ratio * 80;

            const dayLabel = (() => {
              try {
                const d = new Date(point.date);
                return d.getDate().toString();
              } catch {
                return point.date;
              }
            })();

            return (
              <div key={index} className="flex flex-col items-center justify-end">
                <div
                  className="w-4 rounded-t-full bg-primary/80 hover:bg-primary transition-colors"
                  style={{ height: `${height}px` }}
                  title={`${formatDate(point.date)} : ${value}`}
                />
                <span className="mt-1 text-[9px] text-muted-foreground">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

export default Index;
