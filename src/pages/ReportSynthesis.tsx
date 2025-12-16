import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, TrendingUp, TrendingDown, Ticket, Bus, Users, Fuel, Wrench, 
  Package, Wallet, Loader2, Download, FileSpreadsheet, Building2, Route,
  DollarSign, Percent, AlertTriangle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PeriodFilter, PeriodRange, getPeriodFromPreset } from '@/components/reports/PeriodFilter';
import { generateSynthesisReportPdf } from '@/lib/reportsPdf';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';
};

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const ReportSynthesis = () => {
  const [period, setPeriod] = useState<PeriodRange>(() => getPeriodFromPreset('this_month'));

  // Fetch all synthesis data
  const { data: synthesisData, isLoading } = useQuery({
    queryKey: ['report-synthesis', period],
    queryFn: async () => {
      // Tickets & revenue
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, total_amount, payment_method, status, sold_at')
        .gte('sold_at', period.start.toISOString())
        .lte('sold_at', period.end.toISOString())
        .eq('status', 'paid');

      // Trips
      const { data: trips } = await supabase
        .from('trips')
        .select('id, status, capacity, route_id')
        .gte('departure_datetime', period.start.toISOString())
        .lte('departure_datetime', period.end.toISOString());

      // Shipments
      const { data: shipments } = await supabase
        .from('shipments')
        .select('id, total_amount, status, type')
        .gte('created_at', period.start.toISOString())
        .lte('created_at', period.end.toISOString());

      // Fuel
      const { data: fuelEntries } = await supabase
        .from('fuel_entries')
        .select('id, total_amount, liters')
        .gte('filled_at', period.start.toISOString())
        .lte('filled_at', period.end.toISOString());

      // Maintenance
      const { data: maintenance } = await supabase
        .from('maintenance_orders')
        .select('id, total_cost, status')
        .gte('opened_at', period.start.toISOString())
        .lte('opened_at', period.end.toISOString());

      // Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, amount, category:expense_categories(name)')
        .gte('expense_date', format(period.start, 'yyyy-MM-dd'))
        .lte('expense_date', format(period.end, 'yyyy-MM-dd'));

      // Sessions
      const { data: sessions } = await supabase
        .from('counter_sessions')
        .select('id, difference, status')
        .gte('opened_at', period.start.toISOString())
        .lte('opened_at', period.end.toISOString());

      // Agencies for breakdown
      const { data: agencies } = await supabase.from('agencies').select('id, name');

      // Calculate metrics
      const ticketRevenue = tickets?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;
      const shipmentRevenue = shipments?.filter(s => s.status !== 'cancelled')
        .reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const totalRevenue = ticketRevenue + shipmentRevenue;

      const fuelCost = fuelEntries?.reduce((sum, f) => sum + (f.total_amount || 0), 0) || 0;
      const maintenanceCost = maintenance?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0;
      const expensesCost = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalCosts = fuelCost + maintenanceCost + expensesCost;

      const netResult = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0;

      // Payment methods breakdown
      const paymentBreakdown = tickets?.reduce((acc, t) => {
        const method = t.payment_method || 'other';
        if (!acc[method]) acc[method] = { count: 0, total: 0 };
        acc[method].count++;
        acc[method].total += t.total_amount || 0;
        return acc;
      }, {} as Record<string, { count: number; total: number }>) || {};

      // Cash discrepancies
      const totalDiscrepancy = sessions?.reduce((sum, s) => sum + Math.abs(s.difference || 0), 0) || 0;
      const sessionsWithDiscrepancy = sessions?.filter(s => Math.abs(s.difference || 0) > 0).length || 0;

      // Expenses by category
      const expensesByCategory = expenses?.reduce((acc, e) => {
        const category = (e.category as any)?.name || 'Autre';
        if (!acc[category]) acc[category] = 0;
        acc[category] += e.amount || 0;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        // Key indicators
        totalRevenue,
        ticketRevenue,
        shipmentRevenue,
        totalCosts,
        fuelCost,
        maintenanceCost,
        expensesCost,
        netResult,
        profitMargin,
        
        // Operations
        ticketsCount: tickets?.length || 0,
        tripsCount: trips?.length || 0,
        shipmentsCount: shipments?.filter(s => s.status !== 'cancelled').length || 0,
        fuelLiters: fuelEntries?.reduce((sum, f) => sum + (f.liters || 0), 0) || 0,
        maintenanceOrders: maintenance?.length || 0,
        
        // Cash management
        sessionsCount: sessions?.length || 0,
        totalDiscrepancy,
        sessionsWithDiscrepancy,
        
        // Breakdowns
        paymentBreakdown: Object.entries(paymentBreakdown).map(([method, data]) => ({
          method,
          count: data.count,
          total: data.total,
        })),
        expensesByCategory: Object.entries(expensesByCategory).map(([name, amount]) => ({
          name,
          amount,
        })).sort((a, b) => b.amount - a.amount),
      };
    },
  });

  // Company settings for PDF
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url, address, phone, email, rccm, ifu')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'mobile_money': return 'Mobile Money';
      case 'card': return 'Carte';
      default: return 'Autre';
    }
  };

  const handleExportPdf = () => {
    if (!synthesisData) return;
    generateSynthesisReportPdf(synthesisData, period, {
      name: companySettings?.company_name || 'Transport Express',
      logoUrl: companySettings?.logo_url,
      address: companySettings?.address || '',
      phone: companySettings?.phone || '',
      email: companySettings?.email || '',
      rccm: companySettings?.rccm || '',
      ifu: companySettings?.ifu || '',
    });
    toast.success('PDF généré');
  };

  const handleExportExcel = () => {
    if (!synthesisData) return;
    
    // Summary sheet
    const summaryData = [
      { 'Indicateur': 'Recettes Totales', 'Valeur': synthesisData.totalRevenue },
      { 'Indicateur': 'Recettes Tickets', 'Valeur': synthesisData.ticketRevenue },
      { 'Indicateur': 'Recettes Expéditions', 'Valeur': synthesisData.shipmentRevenue },
      { 'Indicateur': 'Coûts Totaux', 'Valeur': synthesisData.totalCosts },
      { 'Indicateur': 'Carburant', 'Valeur': synthesisData.fuelCost },
      { 'Indicateur': 'Maintenance', 'Valeur': synthesisData.maintenanceCost },
      { 'Indicateur': 'Autres dépenses', 'Valeur': synthesisData.expensesCost },
      { 'Indicateur': 'Résultat Net', 'Valeur': synthesisData.netResult },
      { 'Indicateur': 'Marge (%)', 'Valeur': `${synthesisData.profitMargin.toFixed(1)}%` },
    ];

    const operationsData = [
      { 'Indicateur': 'Tickets vendus', 'Valeur': synthesisData.ticketsCount },
      { 'Indicateur': 'Voyages', 'Valeur': synthesisData.tripsCount },
      { 'Indicateur': 'Expéditions', 'Valeur': synthesisData.shipmentsCount },
      { 'Indicateur': 'Litres carburant', 'Valeur': synthesisData.fuelLiters },
      { 'Indicateur': 'Ordres maintenance', 'Valeur': synthesisData.maintenanceOrders },
    ];
    
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(operationsData);
    const ws3 = XLSX.utils.json_to_sheet(synthesisData.paymentBreakdown.map(p => ({
      'Mode': getPaymentLabel(p.method),
      'Tickets': p.count,
      'Montant': p.total,
    })));
    const ws4 = XLSX.utils.json_to_sheet(synthesisData.expensesByCategory.map(e => ({
      'Catégorie': e.name,
      'Montant': e.amount,
    })));
    
    XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');
    XLSX.utils.book_append_sheet(wb, ws2, 'Opérations');
    XLSX.utils.book_append_sheet(wb, ws3, 'Paiements');
    XLSX.utils.book_append_sheet(wb, ws4, 'Dépenses');
    XLSX.writeFile(wb, `synthese_globale_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel généré');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Synthèse Globale</h1>
            <p className="text-muted-foreground mt-1">
              Vue d'ensemble de tous les indicateurs clés
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
            {synthesisData && (
              <>
                <Button variant="outline" onClick={handleExportPdf}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : synthesisData && (
          <>
            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-l-4 border-l-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Recettes Totales</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(synthesisData.totalRevenue)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 border-l-4 border-l-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Coûts Totaux</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(synthesisData.totalCosts)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-red-500/10">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 border-l-4 border-l-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Résultat Net</p>
                    <p className={`text-2xl font-bold ${synthesisData.netResult >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(synthesisData.netResult)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </Card>

              <Card className="p-5 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Marge Bénéficiaire</p>
                    <p className={`text-2xl font-bold ${synthesisData.profitMargin >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                      {synthesisData.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Percent className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-5">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Détail des Recettes
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Ticket className="w-5 h-5 text-primary" />
                      <span>Billets de transport</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(synthesisData.ticketRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-orange-500" />
                      <span>Expéditions & Bagages</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(synthesisData.shipmentRevenue)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  Détail des Coûts
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Fuel className="w-5 h-5 text-yellow-600" />
                      <span>Carburant ({synthesisData.fuelLiters.toLocaleString()} L)</span>
                    </div>
                    <span className="font-semibold text-red-600">{formatCurrency(synthesisData.fuelCost)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-5 h-5 text-blue-600" />
                      <span>Maintenance ({synthesisData.maintenanceOrders} ordres)</span>
                    </div>
                    <span className="font-semibold text-red-600">{formatCurrency(synthesisData.maintenanceCost)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-purple-600" />
                      <span>Autres dépenses</span>
                    </div>
                    <span className="font-semibold text-red-600">{formatCurrency(synthesisData.expensesCost)}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Operations Overview */}
            <Card className="p-5">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Indicateurs Opérationnels
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Ticket className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{synthesisData.ticketsCount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Tickets vendus</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Bus className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{synthesisData.tripsCount}</p>
                  <p className="text-sm text-muted-foreground">Voyages</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Package className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-2xl font-bold">{synthesisData.shipmentsCount}</p>
                  <p className="text-sm text-muted-foreground">Expéditions</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{synthesisData.sessionsCount}</p>
                  <p className="text-sm text-muted-foreground">Sessions caisse</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <Wrench className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold">{synthesisData.maintenanceOrders}</p>
                  <p className="text-sm text-muted-foreground">Maintenances</p>
                </div>
              </div>
            </Card>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Répartition par mode de paiement
                  </h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-center">Tickets</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {synthesisData.paymentBreakdown.map((p) => (
                      <TableRow key={p.method}>
                        <TableCell>{getPaymentLabel(p.method)}</TableCell>
                        <TableCell className="text-center">{p.count}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Expenses by Category */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    Dépenses par catégorie
                  </h3>
                </div>
                {synthesisData.expensesByCategory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Catégorie</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {synthesisData.expensesByCategory.slice(0, 8).map((e) => (
                        <TableRow key={e.name}>
                          <TableCell>{e.name}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(e.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune dépense pour cette période</p>
                  </div>
                )}
              </Card>
            </div>

            {/* Cash Management Alert */}
            {synthesisData.sessionsWithDiscrepancy > 0 && (
              <Card className="p-5 border-orange-500/30 bg-orange-500/5">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-700 dark:text-orange-400">
                      Alertes Écarts de Caisse
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {synthesisData.sessionsWithDiscrepancy} session(s) avec écart détecté — 
                      Montant total des écarts : <strong>{formatCurrency(synthesisData.totalDiscrepancy)}</strong>
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportSynthesis;
