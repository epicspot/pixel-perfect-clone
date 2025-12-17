import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AgencyFilter } from '@/components/filters/AgencyFilter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Building2,
  BarChart3,
  Lock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';

type PeriodType = 'this_month' | 'last_month' | 'this_year' | 'custom';

const Comptabilite = () => {
  const { profile } = useAuth();
  const { canView } = usePermissions();
  const [periodType, setPeriodType] = useState<PeriodType>('this_month');
  const [agencyFilter, setAgencyFilter] = useState('');
  
  const isAdmin = profile?.role === 'admin';
  const canViewComptabilite = canView('comptabilite');
  const filterAgencyId = isAdmin 
    ? (agencyFilter ? Number(agencyFilter) : undefined)
    : profile?.agency_id || undefined;

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    switch (periodType) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'this_year':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();
  const startDate = format(start, 'yyyy-MM-dd');
  const endDate = format(end, 'yyyy-MM-dd');

  // Fetch revenue (tickets)
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['accounting-revenue', startDate, endDate, filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select('id, price, total_amount, sold_at, payment_method, status, agency_id')
        .gte('sold_at', `${startDate}T00:00:00`)
        .lte('sold_at', `${endDate}T23:59:59`)
        .eq('status', 'paid');

      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch shipment revenue
  const { data: shipmentRevenueData } = useQuery({
    queryKey: ['accounting-shipments', startDate, endDate, filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select('id, total_amount, created_at, status, departure_agency_id')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .neq('status', 'cancelled');

      if (filterAgencyId) {
        query = query.eq('departure_agency_id', filterAgencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch expenses
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['accounting-expenses', startDate, endDate, filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('id, amount, expense_date, category_id, description, expense_categories(name)')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch fuel costs
  const { data: fuelData } = useQuery({
    queryKey: ['accounting-fuel', startDate, endDate, filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('fuel_entries')
        .select('id, total_amount, filled_at')
        .gte('filled_at', `${startDate}T00:00:00`)
        .lte('filled_at', `${endDate}T23:59:59`);

      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch maintenance costs
  const { data: maintenanceData } = useQuery({
    queryKey: ['accounting-maintenance', startDate, endDate, filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_orders')
        .select('id, total_cost, opened_at, status')
        .gte('opened_at', `${startDate}T00:00:00`)
        .lte('opened_at', `${endDate}T23:59:59`)
        .not('total_cost', 'is', null);

      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate totals
  const ticketRevenue = revenueData?.reduce((sum, t) => sum + (t.price || t.total_amount || 0), 0) || 0;
  const shipmentRevenue = shipmentRevenueData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
  const totalRevenue = ticketRevenue + shipmentRevenue;
  
  const expenseTotal = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  const fuelTotal = fuelData?.reduce((sum, f) => sum + (f.total_amount || 0), 0) || 0;
  const maintenanceTotal = maintenanceData?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;
  const totalExpenses = expenseTotal + fuelTotal + maintenanceTotal;
  
  const netResult = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0;

  // Group expenses by category
  const expensesByCategory = expensesData?.reduce((acc, exp) => {
    const catName = (exp.expense_categories as any)?.name || 'Non catégorisé';
    acc[catName] = (acc[catName] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  // Add fuel and maintenance as categories
  const allExpensesByCategory = {
    ...expensesByCategory,
    'Carburant': fuelTotal,
    'Maintenance': maintenanceTotal,
  };

  // Prepare chart data
  const chartData = Object.entries(allExpensesByCategory)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Revenue by payment method
  const revenueByPayment = revenueData?.reduce((acc, t) => {
    const method = t.payment_method || 'cash';
    acc[method] = (acc[method] || 0) + (t.price || t.total_amount || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  const paymentLabels: Record<string, string> = {
    cash: 'Espèces',
    mobile_money: 'Mobile Money',
    card: 'Carte',
    other: 'Autre',
  };

  const isLoading = revenueLoading || expensesLoading;

  const getPeriodLabel = () => {
    switch (periodType) {
      case 'this_month':
        return format(start, 'MMMM yyyy', { locale: fr });
      case 'last_month':
        return format(start, 'MMMM yyyy', { locale: fr });
      case 'this_year':
        return `Année ${format(start, 'yyyy')}`;
      default:
        return '';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
              Tableau de bord comptable
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Suivi des recettes, dépenses et résultats
            </p>
          </div>
        </div>

        {/* Read-only Alert */}
        {!canViewComptabilite && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              Vous n'avez pas les permissions pour accéder à la comptabilité.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Période</p>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Ce mois</SelectItem>
                <SelectItem value="last_month">Mois dernier</SelectItem>
                <SelectItem value="this_year">Cette année</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AgencyFilter value={agencyFilter} onChange={setAgencyFilter} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">{getPeriodLabel()}</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">Recettes totales</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-800 dark:text-green-300 mt-1">
                      {formatCurrency(totalRevenue)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Tickets: {formatCurrency(ticketRevenue)}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-100 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">Dépenses totales</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-red-800 dark:text-red-300 mt-1">
                      {formatCurrency(totalExpenses)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Carbu: {formatCurrency(fuelTotal)}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Result */}
          <Card className={`bg-gradient-to-br ${
            netResult >= 0 
              ? 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800' 
              : 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-100 dark:border-orange-800'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-medium ${netResult >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                    Résultat net
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className={`text-2xl font-bold mt-1 ${
                      netResult >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-orange-800 dark:text-orange-300'
                    }`}>
                      {netResult >= 0 ? '+' : ''}{formatCurrency(netResult)}
                    </p>
                  )}
                  <Badge 
                    variant="outline" 
                    className={`mt-2 ${netResult >= 0 ? 'border-blue-300 text-blue-600' : 'border-orange-300 text-orange-600'}`}
                  >
                    {netResult >= 0 ? 'Bénéfice' : 'Perte'}
                  </Badge>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  netResult >= 0 ? 'bg-blue-500/20' : 'bg-orange-500/20'
                }`}>
                  <Wallet className={`w-5 h-5 ${netResult >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit Margin */}
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-100 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Marge bénéficiaire</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-purple-800 dark:text-purple-300 mt-1">
                      {profitMargin.toFixed(1)}%
                    </p>
                  )}
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    {revenueData?.length || 0} transactions
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Répartition des dépenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Aucune dépense sur cette période
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Recettes par mode de paiement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(revenueByPayment).map(([method, amount]) => {
                  const percentage = totalRevenue > 0 ? (amount / ticketRevenue) * 100 : 0;
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{paymentLabels[method] || method}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{percentage.toFixed(1)}%</p>
                    </div>
                  );
                })}
                {Object.keys(revenueByPayment).length === 0 && !isLoading && (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Aucune recette sur cette période
                  </div>
                )}

                {/* Shipment revenue */}
                {shipmentRevenue > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Expéditions</span>
                      <span className="font-medium">{formatCurrency(shipmentRevenue)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail des dépenses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(allExpensesByCategory)
                    .filter(([_, value]) => value > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, amount]) => (
                      <TableRow key={category}>
                        <TableCell className="font-medium">{category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))}
                  {Object.keys(allExpensesByCategory).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Aucune dépense
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Résumé financier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Recettes tickets</span>
                  </div>
                  <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(ticketRevenue)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Recettes expéditions</span>
                  </div>
                  <span className="font-bold text-green-700 dark:text-green-400">{formatCurrency(shipmentRevenue)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">Dépenses diverses</span>
                  </div>
                  <span className="font-bold text-red-700 dark:text-red-400">-{formatCurrency(expenseTotal)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">Carburant</span>
                  </div>
                  <span className="font-bold text-red-700 dark:text-red-400">-{formatCurrency(fuelTotal)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">Maintenance</span>
                  </div>
                  <span className="font-bold text-red-700 dark:text-red-400">-{formatCurrency(maintenanceTotal)}</span>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  netResult >= 0 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <Wallet className={`w-5 h-5 ${netResult >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                    <span className="font-semibold">Résultat net</span>
                  </div>
                  <span className={`text-xl font-bold ${
                    netResult >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
                  }`}>
                    {netResult >= 0 ? '+' : ''}{formatCurrency(netResult)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Comptabilite;
