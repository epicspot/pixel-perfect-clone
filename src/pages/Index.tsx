import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, 
  Ticket, 
  Bus, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Wallet,
  CreditCard,
  Smartphone,
  Calendar,
  Activity,
  Wrench,
  Fuel,
  Users,
  FileText,
  Settings,
  Package,
  DollarSign,
  Monitor,
  ChevronRight
} from 'lucide-react';
import { AgencyFilter } from '@/components/filters/AgencyFilter';
import { NotificationWidget } from '@/components/dashboard/NotificationWidget';
import MarqueeBanner from '@/components/dashboard/MarqueeBanner';
import { TodaySessionsWidget } from '@/components/dashboard/TodaySessionsWidget';
import { getRoleLabel, UserRole } from '@/lib/permissions';
import { RoleSpecificStats } from '@/components/dashboard/RoleSpecificStats';

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const getSubtitle = () => {
    if (!isAdminView) return 'Vue simplifiée – ventes et voyages';
    if (!isAdmin && profile?.agency_name) return `Données de ${profile.agency_name}`;
    if (selectedAgencyId) return 'Vue filtrée par agence';
    return 'Vue globale de toutes les agences';
  };

  // Role-based quick actions
  const getQuickActions = () => {
    const role = profile?.role as UserRole;
    const actions = {
      admin: [
        { label: 'Vendre un ticket', icon: Ticket, href: '/tickets', color: 'from-blue-500 to-indigo-600' },
        { label: 'Gérer les voyages', icon: Bus, href: '/voyages', color: 'from-orange-500 to-amber-600' },
        { label: 'Utilisateurs', icon: Users, href: '/admin', color: 'from-purple-500 to-pink-600' },
        { label: 'Rapports', icon: FileText, href: '/rapports', color: 'from-emerald-500 to-teal-600' },
        { label: 'Paramètres', icon: Settings, href: '/parametres', color: 'from-gray-500 to-slate-600' },
      ],
      manager: [
        { label: 'Vendre un ticket', icon: Ticket, href: '/tickets', color: 'from-blue-500 to-indigo-600' },
        { label: 'Créer un voyage', icon: Bus, href: '/voyages', color: 'from-orange-500 to-amber-600' },
        { label: 'Expéditions', icon: Package, href: '/expeditions', color: 'from-cyan-500 to-blue-600' },
        { label: 'Sessions guichet', icon: Monitor, href: '/guichets', color: 'from-violet-500 to-purple-600' },
        { label: 'Rapports agence', icon: FileText, href: '/rapports/agence', color: 'from-emerald-500 to-teal-600' },
      ],
      cashier: [
        { label: 'Vendre un ticket', icon: Ticket, href: '/tickets', color: 'from-blue-500 to-indigo-600' },
        { label: 'Ouvrir session', icon: Monitor, href: '/guichets', color: 'from-violet-500 to-purple-600' },
        { label: 'Expéditions', icon: Package, href: '/expeditions', color: 'from-cyan-500 to-blue-600' },
        { label: 'Voyages du jour', icon: Bus, href: '/voyages', color: 'from-orange-500 to-amber-600' },
      ],
      accountant: [
        { label: 'Comptabilité', icon: DollarSign, href: '/comptabilite', color: 'from-emerald-500 to-teal-600' },
        { label: 'Dépenses', icon: Wallet, href: '/depenses', color: 'from-red-500 to-rose-600' },
        { label: 'Paie', icon: Users, href: '/paie', color: 'from-blue-500 to-indigo-600' },
        { label: 'Rapports', icon: FileText, href: '/rapports', color: 'from-purple-500 to-pink-600' },
      ],
      mechanic: [
        { label: 'Maintenance', icon: Wrench, href: '/maintenance', color: 'from-orange-500 to-amber-600' },
        { label: 'Carburant', icon: Fuel, href: '/carburant', color: 'from-emerald-500 to-teal-600' },
        { label: 'Coûts véhicules', icon: Bus, href: '/couts-vehicules', color: 'from-blue-500 to-indigo-600' },
      ],
    };
    return actions[role] || actions.cashier;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Marquee Banner */}
        <MarqueeBanner />
        
        {/* Header with Welcome */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {getGreeting()}, {profile?.name?.split(' ')[0] || 'Utilisateur'} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="text-border">•</span>
              {getSubtitle()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin && (
              <AgencyFilter
                value={selectedAgencyId}
                onChange={setSelectedAgencyId}
                className="w-48"
              />
            )}
            <NotificationWidget />
          </div>
        </div>

        {/* Quick Actions - Role based */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-4">
            <ChevronRight className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Accès rapide</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {getRoleLabel(profile?.role as UserRole)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {getQuickActions().map((action, idx) => (
              <Link
                key={action.href}
                to={action.href}
                className="group relative overflow-hidden p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${action.color} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-15 transition-opacity`} />
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md mb-3`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Role-Specific Stats */}
        <RoleSpecificStats agencyId={selectedAgencyId ? Number(selectedAgencyId) : undefined} />

        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Aperçu des performances</h2>
          </div>
          <div className="flex rounded-xl bg-muted p-1 text-sm">
            <PeriodChip label="Aujourd'hui" value="today" current={period} onClick={setPeriod} />
            <PeriodChip label="7 jours" value="week" current={period} onClick={setPeriod} />
            <PeriodChip label="Ce mois" value="month" current={period} onClick={setPeriod} />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-destructive animate-fade-in">
            <p className="font-medium">Erreur de chargement</p>
            <p className="text-sm opacity-80 mt-1">Impossible de récupérer les statistiques. Vérifiez votre connexion.</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}

        {/* Main Stats */}
        {stats && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Recettes totales"
                value={formatCurrency(stats.period.sales_amount)}
                change={stats.today.sales_amount}
                changeLabel="aujourd'hui"
                icon={TrendingUp}
                gradient="from-emerald-500 to-teal-600"
                delay={0}
              />
              <KpiCard
                label="Tickets vendus"
                value={stats.period.tickets_count.toString()}
                change={stats.today.tickets_count}
                changeLabel="aujourd'hui"
                icon={Ticket}
                gradient="from-blue-500 to-indigo-600"
                delay={1}
              />
              <KpiCard
                label="Voyages effectués"
                value={stats.period.trips_count.toString()}
                change={stats.today.trips_count}
                changeLabel="aujourd'hui"
                icon={Bus}
                gradient="from-orange-500 to-amber-600"
                delay={2}
              />
              <KpiCard
                label="Agences actives"
                value={stats.per_agency.length.toString()}
                icon={Building2}
                gradient="from-purple-500 to-pink-600"
                delay={3}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2 p-6 bg-card border-border/50 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-semibold text-card-foreground">
                      Évolution des recettes
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {stats.daily_sales.length} jour(s) de données
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-primary/60" />
                    <span className="text-muted-foreground">Recettes</span>
                  </div>
                </div>

                {stats.daily_sales.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Aucune donnée sur la période</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-56 flex items-end gap-2">
                    {stats.daily_sales.map((day, idx) => {
                      const max = Math.max(...stats.daily_sales.map(d => d.total_amount));
                      const ratio = max > 0 ? day.total_amount / max : 0;
                      const height = Math.max(8, ratio * 100);
                      
                      return (
                        <div 
                          key={idx} 
                          className="flex-1 flex flex-col items-center group"
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                          <div className="relative w-full">
                            <div 
                              className="w-full bg-gradient-to-t from-primary to-primary/40 rounded-t-lg transition-all duration-500 hover:from-primary hover:to-primary/70 cursor-pointer"
                              style={{ 
                                height: `${height * 2}px`,
                                animation: 'growUp 0.6s ease-out forwards',
                                animationDelay: `${idx * 0.05 + 0.3}s`,
                                transform: 'scaleY(0)',
                                transformOrigin: 'bottom'
                              }}
                            />
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg z-10">
                              {formatCurrency(day.total_amount)}
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
                            </div>
                          </div>
                          <span className="mt-3 text-xs text-muted-foreground font-medium">
                            {getDayLabel(day.date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Recent Sales */}
              <Card className="p-6 bg-card border-border/50 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-card-foreground">Ventes récentes</h3>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {stats.recent_tickets.length} ventes
                  </span>
                </div>

                <div className="space-y-3">
                  {stats.recent_tickets.slice(0, 5).map((t, idx) => (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      style={{ animationDelay: `${idx * 0.1 + 0.4}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <PaymentIcon method={t.payment_method} />
                        <div>
                          <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                            {t.customer_name || 'Client anonyme'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.sold_at ? formatTime(t.sold_at) : '-'}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(t.price)}
                      </span>
                    </div>
                  ))}
                  {stats.recent_tickets.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucune vente récente</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Agency Performance */}
            {stats.per_agency.length > 0 && (
              <Card className="p-6 bg-card border-border/50 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-semibold text-card-foreground">Performance par agence</h3>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                    {stats.per_agency.length} agence(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.per_agency.map((agency, idx) => {
                    const share = stats.period.sales_amount > 0 
                      ? (agency.total_amount / stats.period.sales_amount * 100)
                      : 0;
                    
                    return (
                      <div 
                        key={agency.agency_id}
                        className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300"
                        style={{ animationDelay: `${idx * 0.1 + 0.5}s` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-foreground truncate">{agency.agency_name}</h4>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {share.toFixed(0)}%
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Recettes</span>
                            <span className="font-semibold text-foreground">{formatCurrency(agency.total_amount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tickets</span>
                            <span className="font-medium text-foreground">{agency.tickets_count}</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000"
                              style={{ 
                                width: `${share}%`,
                                animation: 'growWidth 1s ease-out forwards',
                                animationDelay: `${idx * 0.1 + 0.7}s`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Today's Sessions Widget - for managers and admins */}
            {isAdminView && (
              <TodaySessionsWidget agencyId={selectedAgencyId ? Number(selectedAgencyId) : undefined} />
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes growUp {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        @keyframes growWidth {
          from { width: 0; }
        }
      `}</style>
    </DashboardLayout>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-56 w-full" />
      </Card>
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    </div>
  </>
);

// KPI Card Component
interface KpiCardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  gradient: string;
  delay?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  label, 
  value, 
  change, 
  changeLabel, 
  icon: Icon, 
  gradient,
  delay = 0 
}) => {
  const hasPositiveChange = change !== undefined && change > 0;
  
  return (
    <Card 
      className="relative overflow-hidden p-5 bg-card border-border/50 group hover:shadow-lg transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${delay * 0.1}s` }}
    >
      {/* Gradient background accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity`} />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {value}
        </div>
        
        {change !== undefined && (
          <div className="flex items-center gap-1.5">
            {hasPositiveChange ? (
              <>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    +{typeof change === 'number' && change > 1000 ? formatCurrency(change) : change}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Pas de changement {changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

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
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
      }`}
    >
      {label}
    </button>
  );
};

// Payment Icon Component
const PaymentIcon: React.FC<{ method: string }> = ({ method }) => {
  const lowerMethod = method?.toLowerCase() || 'cash';
  
  if (lowerMethod.includes('mobile') || lowerMethod.includes('money')) {
    return (
      <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <Smartphone className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      </div>
    );
  }
  if (lowerMethod.includes('carte') || lowerMethod.includes('card')) {
    return (
      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
      <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    </div>
  );
};

// Helpers
function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';
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
    return d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3);
  } catch {
    return dateStr;
  }
}

export default Index;
