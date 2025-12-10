import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Calculator, CheckCircle, Clock, AlertTriangle, Wallet, CreditCard, Smartphone } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

const statusConfig = {
  open: { label: 'Ouverte', variant: 'secondary' as const, icon: Clock },
  closed: { label: 'Clôturée', variant: 'default' as const, icon: CheckCircle },
  validated: { label: 'Validée', variant: 'outline' as const, icon: CheckCircle },
};

export default function ClotureCaisse() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch today's tickets for the current user
  const { data: todayTickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['today-tickets', session?.user?.id, selectedDate],
    queryFn: async () => {
      const startDate = startOfDay(new Date(selectedDate)).toISOString();
      const endDate = endOfDay(new Date(selectedDate)).toISOString();

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('seller_id', session?.user?.id)
        .gte('sold_at', startDate)
        .lte('sold_at', endDate)
        .eq('status', 'paid');

      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  // Fetch existing closures
  const { data: closures, isLoading: loadingClosures } = useQuery({
    queryKey: ['cash-closures', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_closures')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('closure_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  // Calculate totals
  const totals = todayTickets?.reduce(
    (acc, ticket) => {
      acc.total += Number(ticket.price) || 0;
      acc.count += 1;
      if (ticket.payment_method === 'cash') acc.cash += Number(ticket.price) || 0;
      else if (ticket.payment_method === 'mobile_money') acc.mobile += Number(ticket.price) || 0;
      else if (ticket.payment_method === 'card') acc.card += Number(ticket.price) || 0;
      return acc;
    },
    { total: 0, count: 0, cash: 0, mobile: 0, card: 0 }
  ) || { total: 0, count: 0, cash: 0, mobile: 0, card: 0 };

  // Check if already closed today
  const todayClosure = closures?.find(
    (c) => c.closure_date === selectedDate
  );

  // Create closure mutation
  const createClosureMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('cash_closures')
        .insert({
          user_id: session?.user?.id,
          agency_id: profile?.agency_id,
          closure_date: selectedDate,
          from_datetime: startOfDay(new Date(selectedDate)).toISOString(),
          to_datetime: endOfDay(new Date(selectedDate)).toISOString(),
          total_cash_sales: totals.cash,
          total_mobile_money_sales: totals.mobile,
          total_card_sales: totals.card,
          total_tickets_count: totals.count,
          status: 'closed',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Clôture de caisse enregistrée');
      queryClient.invalidateQueries({ queryKey: ['cash-closures'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Clôture de Caisse
            </h1>
            <p className="text-muted-foreground text-sm">
              Récapitulatif des ventes et clôture journalière
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calculator className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total ventes</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Wallet className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Espèces</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.cash)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile Money</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.mobile)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <CreditCard className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carte</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.card)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Close Day Button */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Clôturer la journée du {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayClosure ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium">Journée déjà clôturée</p>
                  <p className="text-sm text-muted-foreground">
                    {totals.count} tickets - {formatCurrency(totals.total)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm text-muted-foreground">Tickets vendus</p>
                    <p className="text-lg font-bold">{totals.count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total espèces</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.cash)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total mobile</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.mobile)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total carte</p>
                    <p className="text-lg font-bold">{formatCurrency(totals.card)}</p>
                  </div>
                </div>

                <Button
                  onClick={() => createClosureMutation.mutate()}
                  disabled={createClosureMutation.isPending || totals.count === 0}
                  className="w-full"
                  size="lg"
                >
                  {createClosureMutation.isPending ? 'Enregistrement...' : 'Clôturer la caisse'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Closures */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des clôtures</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingClosures ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : closures && closures.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead className="text-right">Espèces</TableHead>
                    <TableHead className="text-right">Mobile</TableHead>
                    <TableHead className="text-right">Carte</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closures.map((closure) => {
                    const config = statusConfig[closure.status as keyof typeof statusConfig];
                    const total =
                      Number(closure.total_cash_sales) +
                      Number(closure.total_mobile_money_sales) +
                      Number(closure.total_card_sales);
                    return (
                      <TableRow key={closure.id}>
                        <TableCell className="font-medium">
                          {format(new Date(closure.closure_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{closure.total_tickets_count}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(closure.total_cash_sales))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(closure.total_mobile_money_sales))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(closure.total_card_sales))}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config?.variant}>{config?.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucune clôture enregistrée
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
