import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  Bus, 
  Users, 
  CheckCircle, 
  Clock, 
  Search,
  Eye,
  Calendar,
  MapPin,
  User,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TripWithStats {
  id: number;
  departure_datetime: string;
  status: string;
  route?: {
    name: string;
  };
  vehicle?: {
    registration_number: string;
  };
  driver?: {
    full_name: string;
  };
  assistant?: {
    full_name: string;
  };
  tickets_sold: number;
  stubs_collected: number;
}

interface ScanDetail {
  id: number;
  ticket_reference: string;
  scanned_at: string;
  ticket_data: {
    ref: string;
    client: string;
    montant: number;
    trajet: string;
  };
  scanned_by_name?: string;
}

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: fr });
};

const formatCurrency = (value: number) => {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F CFA';
};

const SuiviSouches = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<TripWithStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch trips with ticket and scan counts
  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips-with-stubs'],
    queryFn: async () => {
      // Get trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          departure_datetime,
          status,
          route:routes(name),
          vehicle:vehicles(registration_number),
          driver:staff!trips_driver_id_fkey(full_name),
          assistant:staff!trips_assistant_id_fkey(full_name)
        `)
        .order('departure_datetime', { ascending: false })
        .limit(50);

      if (tripsError) throw tripsError;

      // Get ticket counts per trip
      const { data: ticketCounts, error: ticketError } = await supabase
        .from('tickets')
        .select('trip_id')
        .in('trip_id', tripsData?.map(t => t.id) || []);

      if (ticketError) throw ticketError;

      // Get scan counts - count by ticket reference matching trip tickets
      const tripIds = tripsData?.map(t => t.id) || [];
      
      // Get tickets for these trips to get their references
      const { data: tripTickets } = await supabase
        .from('tickets')
        .select('trip_id, reference')
        .in('trip_id', tripIds);

      // Get scans for these ticket references
      const ticketRefs = tripTickets?.map(t => t.reference).filter(Boolean) || [];
      const { data: scans } = await supabase
        .from('ticket_scans')
        .select('ticket_reference')
        .in('ticket_reference', ticketRefs);

      // Build scan counts by trip
      const scanCountsByTrip: Record<number, number> = {};
      tripTickets?.forEach(ticket => {
        if (!scanCountsByTrip[ticket.trip_id]) {
          scanCountsByTrip[ticket.trip_id] = 0;
        }
        const hasBeenScanned = scans?.some(s => s.ticket_reference === ticket.reference);
        if (hasBeenScanned) {
          scanCountsByTrip[ticket.trip_id]++;
        }
      });

      // Count tickets per trip
      const ticketCountsByTrip: Record<number, number> = {};
      ticketCounts?.forEach(t => {
        ticketCountsByTrip[t.trip_id] = (ticketCountsByTrip[t.trip_id] || 0) + 1;
      });

      return tripsData?.map(trip => ({
        ...trip,
        route: trip.route as { name: string } | undefined,
        vehicle: trip.vehicle as { registration_number: string } | undefined,
        driver: trip.driver as { full_name: string } | undefined,
        assistant: trip.assistant as { full_name: string } | undefined,
        tickets_sold: ticketCountsByTrip[trip.id] || 0,
        stubs_collected: scanCountsByTrip[trip.id] || 0,
      })) as TripWithStats[];
    },
  });

  // Fetch scan details for selected trip
  const { data: scanDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['trip-scan-details', selectedTrip?.id],
    queryFn: async () => {
      if (!selectedTrip) return [];

      // Get tickets for this trip
      const { data: tickets } = await supabase
        .from('tickets')
        .select('reference')
        .eq('trip_id', selectedTrip.id);

      const refs = tickets?.map(t => t.reference).filter(Boolean) || [];
      if (refs.length === 0) return [];

      // Get scans for these tickets
      const { data: scans, error } = await supabase
        .from('ticket_scans')
        .select(`
          id,
          ticket_reference,
          scanned_at,
          ticket_data,
          scanned_by
        `)
        .in('ticket_reference', refs)
        .order('scanned_at', { ascending: false });

      if (error) throw error;

      // Get scanner names
      const scannerIds = [...new Set(scans?.map(s => s.scanned_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', scannerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]));

      return scans?.map(scan => ({
        ...scan,
        ticket_data: scan.ticket_data as ScanDetail['ticket_data'],
        scanned_by_name: profileMap.get(scan.scanned_by) || 'Inconnu',
      })) as ScanDetail[];
    },
    enabled: !!selectedTrip,
  });

  const filteredTrips = trips?.filter(trip => 
    trip.route?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.vehicle?.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (trip: TripWithStats) => {
    const percentage = trip.tickets_sold > 0 
      ? Math.round((trip.stubs_collected / trip.tickets_sold) * 100) 
      : 0;

    if (percentage === 100) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Complet</Badge>;
    } else if (percentage >= 50) {
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">En cours</Badge>;
    } else if (trip.tickets_sold > 0) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Incomplet</Badge>;
    }
    return <Badge variant="outline">Aucun ticket</Badge>;
  };

  const openDetails = (trip: TripWithStats) => {
    setSelectedTrip(trip);
    setDetailsOpen(true);
  };

  // Stats
  const totalTrips = trips?.length || 0;
  const totalTickets = trips?.reduce((sum, t) => sum + t.tickets_sold, 0) || 0;
  const totalCollected = trips?.reduce((sum, t) => sum + t.stubs_collected, 0) || 0;
  const collectionRate = totalTickets > 0 ? Math.round((totalCollected / totalTickets) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              Suivi des souches
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Suivez la collecte des souches d'embarquement par voyage
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Bus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Voyages</p>
                  <p className="text-xl font-bold">{totalTrips}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tickets vendus</p>
                  <p className="text-xl font-bold">{totalTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Souches collectees</p>
                  <p className="text-xl font-bold">{totalCollected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Taux collecte</p>
                  <p className="text-xl font-bold">{collectionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un voyage..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Trips Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Voyages et collecte des souches</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date/Heure</TableHead>
                  <TableHead className="text-xs">Trajet</TableHead>
                  <TableHead className="text-xs">Vehicule</TableHead>
                  <TableHead className="text-xs">Convoyeur</TableHead>
                  <TableHead className="text-xs text-center">Progression</TableHead>
                  <TableHead className="text-xs text-center">Statut</TableHead>
                  <TableHead className="text-xs text-center w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredTrips && filteredTrips.length > 0 ? (
                  filteredTrips.map((trip) => {
                    const percentage = trip.tickets_sold > 0 
                      ? Math.round((trip.stubs_collected / trip.tickets_sold) * 100) 
                      : 0;

                    return (
                      <TableRow key={trip.id}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            {formatDate(trip.departure_datetime)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {trip.route?.name || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {trip.vehicle?.registration_number || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {trip.assistant?.full_name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} className="h-2 w-20" />
                            <span className="text-xs font-medium">
                              {trip.stubs_collected}/{trip.tickets_sold}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(trip)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetails(trip)}
                            disabled={trip.tickets_sold === 0}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun voyage trouve
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Details des souches collectees
              </DialogTitle>
            </DialogHeader>

            {selectedTrip && (
              <div className="space-y-4">
                {/* Trip Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{selectedTrip.route?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedTrip.departure_datetime)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bus className="w-4 h-4" />
                    {selectedTrip.vehicle?.registration_number || '-'}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm">Progression:</span>
                    <span className="font-bold">
                      {selectedTrip.stubs_collected} / {selectedTrip.tickets_sold} souches
                    </span>
                  </div>
                </div>

                {/* Scan List */}
                {detailsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : scanDetails && scanDetails.length > 0 ? (
                  <div className="space-y-2">
                    {scanDetails.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-mono text-sm font-medium text-primary">
                              {scan.ticket_reference}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {scan.ticket_data?.client || 'Anonyme'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            {formatDate(scan.scanned_at)}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <User className="w-3 h-3" />
                            {scan.scanned_by_name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <QrCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune souche collectee pour ce voyage</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SuiviSouches;
