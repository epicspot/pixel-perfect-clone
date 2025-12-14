import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Monitor, Clock, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SessionSummary {
  id: number;
  user_name: string;
  agency_name: string;
  counter_name: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  tickets_count: number;
  total_sales: number;
  difference: number | null;
}

interface TodaySessionsWidgetProps {
  agencyId?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'decimal' }).format(value) + ' F';
};

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

export function TodaySessionsWidget({ agencyId }: TodaySessionsWidgetProps) {
  const today = new Date().toISOString().split('T')[0];

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['today-sessions-summary', today, agencyId],
    queryFn: async () => {
      // Get today's sessions
      let query = supabase
        .from('counter_sessions')
        .select(`
          id,
          user_id,
          agency_id,
          counter_id,
          status,
          opened_at,
          closed_at,
          difference,
          closing_cash_declared,
          closing_cash_expected
        `)
        .gte('opened_at', `${today}T00:00:00`)
        .lte('opened_at', `${today}T23:59:59`)
        .order('opened_at', { ascending: false });

      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }

      const { data: sessionsData, error } = await query;
      if (error) throw error;
      if (!sessionsData || sessionsData.length === 0) return [];

      // Get user profiles
      const userIds = [...new Set(sessionsData.map(s => s.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      // Get agencies
      const agencyIds = [...new Set(sessionsData.map(s => s.agency_id).filter(Boolean))];
      const { data: agencies } = await supabase
        .from('agencies')
        .select('id, name')
        .in('id', agencyIds);

      // Get counters
      const counterIds = [...new Set(sessionsData.map(s => s.counter_id).filter(Boolean))];
      const { data: counters } = await supabase
        .from('ticket_counters')
        .select('id, name')
        .in('id', counterIds);

      // Get tickets per session
      const sessionIds = sessionsData.map(s => s.id);
      const { data: tickets } = await supabase
        .from('tickets')
        .select('session_id, total_amount, status')
        .in('session_id', sessionIds)
        .eq('status', 'paid');

      // Map sessions with details
      const profilesMap = new Map(profiles?.map(p => [p.id, p.name]) ?? []);
      const agenciesMap = new Map(agencies?.map(a => [a.id, a.name]) ?? []);
      const countersMap = new Map(counters?.map(c => [c.id, c.name]) ?? []);

      return sessionsData.map(session => {
        const sessionTickets = tickets?.filter(t => t.session_id === session.id) ?? [];
        return {
          id: session.id,
          user_name: profilesMap.get(session.user_id ?? '') ?? 'Inconnu',
          agency_name: agenciesMap.get(session.agency_id) ?? 'Inconnue',
          counter_name: countersMap.get(session.counter_id) ?? 'Inconnu',
          status: session.status,
          opened_at: session.opened_at,
          closed_at: session.closed_at,
          tickets_count: sessionTickets.length,
          total_sales: sessionTickets.reduce((sum, t) => sum + (t.total_amount || 0), 0),
          difference: session.difference
        } as SessionSummary;
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const openSessions = sessions?.filter(s => s.status === 'open') ?? [];
  const closedSessions = sessions?.filter(s => s.status === 'closed') ?? [];
  const totalSales = sessions?.reduce((sum, s) => sum + s.total_sales, 0) ?? 0;
  const totalTickets = sessions?.reduce((sum, s) => sum + s.tickets_count, 0) ?? 0;

  return (
    <Card className="p-6 bg-card border-border/50 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-card-foreground">Sessions du jour</h3>
        </div>
        <Link 
          to="/rapports/sessions" 
          className="text-xs text-primary hover:underline"
        >
          Voir le journal →
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Sessions ouvertes</p>
          <p className="text-lg font-semibold text-foreground flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            {openSessions.length}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Sessions fermées</p>
          <p className="text-lg font-semibold text-foreground">{closedSessions.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Tickets vendus</p>
          <p className="text-lg font-semibold text-foreground">{totalTickets}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Ventes totales</p>
          <p className="text-lg font-semibold text-foreground">{formatCurrency(totalSales)}</p>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {sessions?.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Monitor className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune session aujourd'hui</p>
          </div>
        )}

        {sessions?.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-lg ${session.status === 'open' ? 'bg-success/10' : 'bg-muted'}`}>
                {session.status === 'open' ? (
                  <Clock className="w-4 h-4 text-success" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {session.user_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.agency_name} • {session.counter_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(session.total_sales)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.tickets_count} ticket{session.tickets_count > 1 ? 's' : ''}
                </p>
              </div>
              
              <Badge
                variant={session.status === 'open' ? 'default' : 'secondary'}
                className={session.status === 'open' ? 'bg-success/10 text-success border-success/20' : ''}
              >
                {session.status === 'open' ? 'En cours' : 'Fermée'}
              </Badge>

              {session.difference !== null && session.difference !== 0 && (
                <div className={`flex items-center gap-1 text-xs ${session.difference > 0 ? 'text-success' : 'text-destructive'}`}>
                  <AlertCircle className="w-3 h-3" />
                  <span>{session.difference > 0 ? '+' : ''}{formatCurrency(session.difference)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
