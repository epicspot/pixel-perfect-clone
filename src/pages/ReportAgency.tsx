import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, TrendingUp, Ticket, Users, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';
};

const ReportAgency = () => {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('all');
  const [period] = useState(() => {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(now) };
  });

  // Fetch agencies
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agencies').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-agency', selectedAgencyId, period],
    queryFn: async () => {
      // Get trips with tickets
      let tripsQuery = supabase
        .from('trips')
        .select(`
          *,
          route:routes(*),
          tickets(*)
        `)
        .gte('departure_datetime', period.start.toISOString())
        .lte('departure_datetime', period.end.toISOString());

      const { data: trips, error } = await tripsQuery;
      if (error) throw error;

      // Get fuel entries
      let fuelQuery = supabase
        .from('fuel_entries')
        .select('*')
        .gte('filled_at', period.start.toISOString())
        .lte('filled_at', period.end.toISOString());

      if (selectedAgencyId !== 'all') {
        fuelQuery = fuelQuery.eq('agency_id', parseInt(selectedAgencyId));
      }

      const { data: fuelEntries } = await fuelQuery;

      // Aggregate by agency
      const agencyStats: Record<number, {
        agency_name: string;
        trips_count: number;
        tickets_sold: number;
        revenue: number;
        fuel_cost: number;
      }> = {};

      trips?.forEach(trip => {
        const agencyId = trip.route?.departure_agency_id;
        if (!agencyId) return;
        if (selectedAgencyId !== 'all' && agencyId !== parseInt(selectedAgencyId)) return;

        const agency = agencies.find(a => a.id === agencyId);
        if (!agencyStats[agencyId]) {
          agencyStats[agencyId] = {
            agency_name: agency?.name || 'Inconnu',
            trips_count: 0,
            tickets_sold: 0,
            revenue: 0,
            fuel_cost: 0,
          };
        }

        agencyStats[agencyId].trips_count++;
        const paidTickets = trip.tickets?.filter((t: any) => t.status === 'paid') || [];
        agencyStats[agencyId].tickets_sold += paidTickets.length;
        agencyStats[agencyId].revenue += paidTickets.reduce((sum: number, t: any) => sum + t.total_amount, 0);
      });

      fuelEntries?.forEach(entry => {
        const agencyId = entry.agency_id;
        if (!agencyId || !agencyStats[agencyId]) return;
        agencyStats[agencyId].fuel_cost += entry.total_amount;
      });

      const rows = Object.values(agencyStats);
      const totals = rows.reduce(
        (acc, row) => ({
          trips: acc.trips + row.trips_count,
          tickets: acc.tickets + row.tickets_sold,
          revenue: acc.revenue + row.revenue,
          fuel: acc.fuel + row.fuel_cost,
        }),
        { trips: 0, tickets: 0, revenue: 0, fuel: 0 }
      );

      return { rows, totals };
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Rapport par Agence</h1>
          <p className="text-muted-foreground mt-1">
            Performance des agences pour {format(period.start, 'MMMM yyyy', { locale: fr })}
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-64">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Agence</label>
              <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les agences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les agences</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id.toString()}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        {reportData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Voyages</p>
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
                  <p className="text-sm text-muted-foreground">Recettes</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData.totals.revenue)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carburant</p>
                  <p className="text-2xl font-bold">{formatCurrency(reportData.totals.fuel)}</p>
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
                  <TableHead>Agence</TableHead>
                  <TableHead className="text-center">Voyages</TableHead>
                  <TableHead className="text-center">Tickets</TableHead>
                  <TableHead className="text-right">Recettes</TableHead>
                  <TableHead className="text-right">Carburant</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.agency_name}</TableCell>
                    <TableCell className="text-center">{row.trips_count}</TableCell>
                    <TableCell className="text-center">{row.tickets_sold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatCurrency(row.fuel_cost)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(row.revenue - row.fuel_cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune donnée pour cette période</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportAgency;
