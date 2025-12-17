import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Route, TrendingUp, Ticket, Bus, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateRoutesReportPdf } from '@/lib/reportsPdf';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { PeriodFilter, PeriodRange, getPeriodFromPreset } from '@/components/reports/PeriodFilter';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F CFA';
};

const ReportRoutes = () => {
  const [period, setPeriod] = useState<PeriodRange>(() => getPeriodFromPreset('this_month'));

  // Fetch routes with trips and tickets
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-routes', period],
    queryFn: async () => {
      const { data: routes, error } = await supabase
        .from('routes')
        .select(`
          *,
          departure_agency:agencies!routes_departure_agency_id_fkey(*),
          arrival_agency:agencies!routes_arrival_agency_id_fkey(*)
        `)
        .order('name');

      if (error) throw error;

      const { data: trips } = await supabase
        .from('trips')
        .select(`
          *,
          tickets(*)
        `)
        .gte('departure_datetime', period.start.toISOString())
        .lte('departure_datetime', period.end.toISOString());

      // Aggregate by route
      const routeStats = routes?.map(route => {
        const routeTrips = trips?.filter(t => t.route_id === route.id) || [];
        const allTickets = routeTrips.flatMap(t => t.tickets || []);
        const paidTickets = allTickets.filter((t: any) => t.status === 'paid');
        
        return {
          route_name: route.name,
          departure: route.departure_agency?.name || 'N/A',
          arrival: route.arrival_agency?.name || 'N/A',
          base_price: route.base_price,
          trips_count: routeTrips.length,
          tickets_sold: paidTickets.length,
          revenue: paidTickets.reduce((sum: number, t: any) => sum + t.total_amount, 0),
          occupancy: routeTrips.length > 0 
            ? Math.round((paidTickets.length / (routeTrips.length * 50)) * 100) 
            : 0,
        };
      }) || [];

      const totals = routeStats.reduce(
        (acc, row) => ({
          trips: acc.trips + row.trips_count,
          tickets: acc.tickets + row.tickets_sold,
          revenue: acc.revenue + row.revenue,
        }),
        { trips: 0, tickets: 0, revenue: 0 }
      );

      return { rows: routeStats, totals };
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

  const handleExportPdf = () => {
    if (!reportData) return;
    generateRoutesReportPdf(reportData, period, {
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
    if (!reportData) return;
    const data = reportData.rows.map((row) => ({
      'Ligne': row.route_name,
      'Départ': row.departure,
      'Arrivée': row.arrival,
      'Prix base': row.base_price,
      'Voyages': row.trips_count,
      'Tickets': row.tickets_sold,
      'Taux occupation': `${row.occupancy}%`,
      'Recettes': row.revenue,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport Lignes');
    XLSX.writeFile(wb, `rapport_lignes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel généré');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Rapport par Ligne</h1>
            <p className="text-muted-foreground mt-1">
              Performance des lignes — {period.label}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PeriodFilter value={period} onChange={setPeriod} />
            {reportData && reportData.rows.length > 0 && (
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

        {/* Stats Cards */}
        {reportData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total voyages</p>
                  <p className="text-2xl font-bold">{reportData.totals.trips}</p>
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
                  <p className="text-2xl font-bold">{reportData.totals.tickets}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recettes totales</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData.totals.revenue)}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : reportData && reportData.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Ligne</TableHead>
                  <TableHead>Départ → Arrivée</TableHead>
                  <TableHead className="text-right">Prix base</TableHead>
                  <TableHead className="text-center">Voyages</TableHead>
                  <TableHead className="text-center">Tickets</TableHead>
                  <TableHead className="text-center">Taux occup.</TableHead>
                  <TableHead className="text-right">Recettes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.route_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.departure} → {row.arrival}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.base_price)}</TableCell>
                    <TableCell className="text-center">{row.trips_count}</TableCell>
                    <TableCell className="text-center">{row.tickets_sold}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        row.occupancy >= 70 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : row.occupancy >= 40
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {row.occupancy}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(row.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Route className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune ligne configurée</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportRoutes;
