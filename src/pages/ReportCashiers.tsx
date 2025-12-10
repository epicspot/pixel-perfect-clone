import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, TrendingUp, Ticket, CreditCard, Loader2, Banknote, Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';
};

const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'cash':
      return <Banknote className="w-4 h-4" />;
    case 'mobile_money':
      return <Smartphone className="w-4 h-4" />;
    case 'card':
      return <CreditCard className="w-4 h-4" />;
    default:
      return <Wallet className="w-4 h-4" />;
  }
};

const getPaymentLabel = (method: string) => {
  switch (method) {
    case 'cash':
      return 'Espèces';
    case 'mobile_money':
      return 'Mobile Money';
    case 'card':
      return 'Carte';
    default:
      return 'Autre';
  }
};

const ReportCashiers = () => {
  const [dateRange, setDateRange] = useState('today');
  
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const period = getDateRange();

  // Fetch tickets for journal
  const { data: journalData, isLoading } = useQuery({
    queryKey: ['cashier-journal', dateRange],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
          *,
          trip:trips(
            *,
            route:routes(name)
          )
        `)
        .gte('sold_at', period.start.toISOString())
        .lte('sold_at', period.end.toISOString())
        .eq('status', 'paid')
        .order('sold_at', { ascending: false });

      if (error) throw error;

      // Group by payment method
      const byPayment = tickets?.reduce((acc, ticket) => {
        const method = ticket.payment_method || 'other';
        if (!acc[method]) {
          acc[method] = { count: 0, total: 0 };
        }
        acc[method].count++;
        acc[method].total += ticket.total_amount;
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      const totals = {
        count: tickets?.length || 0,
        amount: tickets?.reduce((sum, t) => sum + t.total_amount, 0) || 0,
      };

      return {
        tickets: tickets || [],
        byPayment: Object.entries(byPayment || {}).map(([method, data]) => ({
          method,
          ...data,
        })),
        totals,
      };
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Journal de Caisse</h1>
          <p className="text-muted-foreground mt-1">
            Suivi des encaissements et transactions
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-48">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Période</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="yesterday">Hier</SelectItem>
                  <SelectItem value="week">7 derniers jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Du {format(period.start, 'dd MMM yyyy', { locale: fr })} au {format(period.end, 'dd MMM yyyy', { locale: fr })}
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        {journalData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-primary">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total encaissé</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(journalData.totals.amount)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Ticket className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tickets vendus</p>
                  <p className="text-2xl font-bold">{journalData.totals.count}</p>
                </div>
              </div>
            </Card>
            {journalData.byPayment.map((p) => (
              <Card key={p.method} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {getPaymentIcon(p.method)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{getPaymentLabel(p.method)}</p>
                    <p className="text-lg font-bold">{formatCurrency(p.total)}</p>
                    <p className="text-xs text-muted-foreground">{p.count} tickets</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Transactions Table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Détail des transactions</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : journalData && journalData.tickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Heure</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Voyage</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalData.tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="text-sm">
                      {ticket.sold_at ? format(new Date(ticket.sold_at), 'HH:mm', { locale: fr }) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{ticket.reference || '-'}</TableCell>
                    <TableCell className="text-sm">{ticket.customer_name || 'Anonyme'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ticket.trip?.route?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        {getPaymentIcon(ticket.payment_method || '')}
                        {getPaymentLabel(ticket.payment_method || '')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(ticket.total_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune transaction pour cette période</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportCashiers;
