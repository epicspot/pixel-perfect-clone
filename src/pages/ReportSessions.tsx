import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Monitor, 
  Calendar,
  User,
  Building2,
  ChevronDown,
  ChevronRight,
  Ticket,
  Banknote,
  CreditCard,
  Smartphone,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AgencyFilter } from '@/components/filters/AgencyFilter';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR').format(value) + ' F';
};

const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'cash': return Banknote;
    case 'mobile_money': return Smartphone;
    case 'card': return CreditCard;
    default: return Banknote;
  }
};

const getPaymentLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Espèces';
    case 'mobile_money': return 'Mobile Money';
    case 'card': return 'Carte';
    default: return method;
  }
};

interface SessionWithDetails {
  id: number;
  counter_id: number;
  user_id: string;
  agency_id: number;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash_declared: number | null;
  closing_cash_expected: number | null;
  difference: number | null;
  status: string;
  closing_notes: string | null;
  counterName: string;
  userName: string;
  agencyName: string;
  tickets: {
    id: number;
    reference: string;
    customer_name: string;
    total_amount: number;
    payment_method: string;
    sold_at: string;
  }[];
  totalSales: number;
  ticketCount: number;
  cashSales: number;
  mobileSales: number;
  cardSales: number;
}

export default function ReportSessions() {
  const { profile } = useAuth();
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const filterAgencyId = isAdmin 
    ? (selectedAgencyId ? parseInt(selectedAgencyId) : null)
    : profile?.agency_id;

  // Fetch cashiers/users
  const { data: users = [] } = useQuery({
    queryKey: ['cashier-users', filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, name, agency_id')
        .in('role', ['cashier', 'manager', 'admin'])
        .order('name');
      
      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch sessions with tickets
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['session-report', filterAgencyId, selectedUserId, startDate, endDate],
    queryFn: async () => {
      // Fetch sessions
      let sessionQuery = supabase
        .from('counter_sessions')
        .select(`
          *,
          counter:ticket_counters(id, name)
        `)
        .gte('opened_at', `${startDate}T00:00:00`)
        .lte('opened_at', `${endDate}T23:59:59`)
        .order('opened_at', { ascending: false });

      if (filterAgencyId) {
        sessionQuery = sessionQuery.eq('agency_id', filterAgencyId);
      }
      if (selectedUserId) {
        sessionQuery = sessionQuery.eq('user_id', selectedUserId);
      }

      const { data: sessionsData, error: sessionsError } = await sessionQuery;
      if (sessionsError) throw sessionsError;

      if (!sessionsData || sessionsData.length === 0) return [];

      // Fetch user names
      const userIds = [...new Set(sessionsData.map(s => s.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
      const userMap = Object.fromEntries(profiles?.map(p => [p.id, p.name]) || []);

      // Fetch agency names
      const agencyIds = [...new Set(sessionsData.map(s => s.agency_id).filter(Boolean))];
      const { data: agencies } = await supabase
        .from('agencies')
        .select('id, name')
        .in('id', agencyIds);
      const agencyMap = Object.fromEntries(agencies?.map(a => [a.id, a.name]) || []);

      // Fetch tickets for each session
      const sessionIds = sessionsData.map(s => s.id);
      const { data: allTickets } = await supabase
        .from('tickets')
        .select('id, reference, customer_name, total_amount, payment_method, sold_at, session_id')
        .in('session_id', sessionIds)
        .eq('status', 'paid');

      // Also fetch tickets by time range for sessions without session_id linking
      const ticketsBySession: Record<number, typeof allTickets> = {};
      sessionIds.forEach(id => {
        ticketsBySession[id] = allTickets?.filter(t => t.session_id === id) || [];
      });

      // For older sessions without session_id, fetch by seller_id and time range
      for (const session of sessionsData) {
        if (ticketsBySession[session.id]?.length === 0 && session.user_id) {
          const { data: legacyTickets } = await supabase
            .from('tickets')
            .select('id, reference, customer_name, total_amount, payment_method, sold_at, session_id')
            .eq('seller_id', session.user_id)
            .gte('sold_at', session.opened_at)
            .lte('sold_at', session.closed_at || new Date().toISOString())
            .eq('status', 'paid')
            .is('session_id', null);
          
          if (legacyTickets && legacyTickets.length > 0) {
            ticketsBySession[session.id] = legacyTickets;
          }
        }
      }

      // Build enriched sessions
      const enrichedSessions: SessionWithDetails[] = sessionsData.map(session => {
        const tickets = ticketsBySession[session.id] || [];
        const cashSales = tickets
          .filter(t => t.payment_method === 'cash')
          .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
        const mobileSales = tickets
          .filter(t => t.payment_method === 'mobile_money')
          .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
        const cardSales = tickets
          .filter(t => t.payment_method === 'card')
          .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

        return {
          id: session.id,
          counter_id: session.counter_id,
          user_id: session.user_id,
          agency_id: session.agency_id,
          opened_at: session.opened_at,
          closed_at: session.closed_at,
          opening_cash: session.opening_cash || 0,
          closing_cash_declared: session.closing_cash_declared,
          closing_cash_expected: session.closing_cash_expected,
          difference: session.difference,
          status: session.status,
          closing_notes: session.closing_notes,
          counterName: session.counter?.name || 'N/A',
          userName: userMap[session.user_id] || 'Inconnu',
          agencyName: agencyMap[session.agency_id] || 'N/A',
          tickets: tickets.map(t => ({
            id: t.id,
            reference: t.reference || '',
            customer_name: t.customer_name || '',
            total_amount: Number(t.total_amount || 0),
            payment_method: t.payment_method || 'cash',
            sold_at: t.sold_at || '',
          })),
          totalSales: cashSales + mobileSales + cardSales,
          ticketCount: tickets.length,
          cashSales,
          mobileSales,
          cardSales,
        };
      });

      return enrichedSessions;
    },
  });

  const toggleSession = (id: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSessions(newExpanded);
  };

  // Calculate totals
  const totals = sessions.reduce((acc, session) => ({
    sessions: acc.sessions + 1,
    tickets: acc.tickets + session.ticketCount,
    totalSales: acc.totalSales + session.totalSales,
    cashSales: acc.cashSales + session.cashSales,
    mobileSales: acc.mobileSales + session.mobileSales,
    cardSales: acc.cardSales + session.cardSales,
    openingCash: acc.openingCash + session.opening_cash,
    closingDeclared: acc.closingDeclared + (session.closing_cash_declared || 0),
    difference: acc.difference + (session.difference || 0),
  }), {
    sessions: 0,
    tickets: 0,
    totalSales: 0,
    cashSales: 0,
    mobileSales: 0,
    cardSales: 0,
    openingCash: 0,
    closingDeclared: 0,
    difference: 0,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Journal des Sessions</h1>
          <p className="text-muted-foreground">Rapport détaillé des sessions de guichet avec tickets vendus</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              {isAdmin && (
                <AgencyFilter
                  value={selectedAgencyId}
                  onChange={setSelectedAgencyId}
                />
              )}
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Caissier
                </Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Tous les caissiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tous les caissiers</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Date début
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Date fin
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Monitor className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                  <p className="text-xl font-bold">{totals.sessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Ticket className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tickets</p>
                  <p className="text-xl font-bold">{totals.tickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Banknote className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Ventes</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.totalSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Espèces</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.cashSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mobile</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.mobileSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  totals.difference === 0 ? 'bg-green-500/10' : 
                  totals.difference > 0 ? 'bg-blue-500/10' : 'bg-red-500/10'
                }`}>
                  {totals.difference === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : totals.difference > 0 ? (
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Écart Total</p>
                  <p className={`text-xl font-bold ${
                    totals.difference === 0 ? 'text-green-600' : 
                    totals.difference > 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {totals.difference > 0 ? '+' : ''}{formatCurrency(totals.difference)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Détail des Sessions
            </CardTitle>
            <CardDescription>
              Cliquez sur une session pour voir les tickets vendus
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement...
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune session trouvée pour cette période
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <Collapsible
                    key={session.id}
                    open={expandedSessions.has(session.id)}
                    onOpenChange={() => toggleSession(session.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {expandedSessions.has(session.id) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Monitor className="w-4 h-4 text-primary" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{session.counterName}</span>
                              <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                                {session.status === 'open' ? 'En cours' : 'Fermée'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {session.userName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {session.agencyName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(parseISO(session.opened_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                {session.closed_at && ` - ${format(parseISO(session.closed_at), 'HH:mm', { locale: fr })}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <p className="text-xs text-muted-foreground">Tickets</p>
                            <p className="font-medium">{session.ticketCount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Ventes</p>
                            <p className="font-medium text-green-600">{formatCurrency(session.totalSales)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Fond caisse</p>
                            <p className="font-medium">{formatCurrency(session.opening_cash)}</p>
                          </div>
                          {session.status === 'closed' && (
                            <div>
                              <p className="text-xs text-muted-foreground">Écart</p>
                              <p className={`font-medium ${
                                (session.difference || 0) === 0 ? 'text-green-600' : 
                                (session.difference || 0) > 0 ? 'text-blue-600' : 'text-red-600'
                              }`}>
                                {(session.difference || 0) > 0 ? '+' : ''}{formatCurrency(session.difference || 0)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-10 mt-2 p-4 rounded-lg border bg-muted/30">
                        {session.tickets.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Aucun ticket vendu pendant cette session
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Référence</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Heure</TableHead>
                                <TableHead>Paiement</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {session.tickets.map((ticket) => {
                                const PaymentIcon = getPaymentIcon(ticket.payment_method);
                                return (
                                  <TableRow key={ticket.id}>
                                    <TableCell className="font-mono text-sm">
                                      {ticket.reference || `#${ticket.id}`}
                                    </TableCell>
                                    <TableCell>{ticket.customer_name || 'N/A'}</TableCell>
                                    <TableCell>
                                      {ticket.sold_at && format(parseISO(ticket.sold_at), 'HH:mm', { locale: fr })}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <PaymentIcon className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">{getPaymentLabel(ticket.payment_method)}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(ticket.total_amount)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                        {session.closing_notes && (
                          <div className="mt-4 p-3 rounded bg-background">
                            <p className="text-xs text-muted-foreground mb-1">Notes de fermeture:</p>
                            <p className="text-sm">{session.closing_notes}</p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
