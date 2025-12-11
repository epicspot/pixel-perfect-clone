import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Trip } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, MapPin, Clock, Users, Calendar, Bus, Search, Pencil, Trash2, FileText, Play, UserCheck, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AgencyFilter } from '@/components/filters/AgencyFilter';
import { toast } from '@/hooks/use-toast';
import { generateTripManifestPdf } from '@/lib/documentPdf';
import { supabase } from '@/integrations/supabase/client';
import { audit } from '@/lib/audit';

// Trip lifecycle statuses
const statusConfig: Record<string, { label: string; className: string; icon?: React.ReactNode }> = {
  planned: { label: 'Programmé', className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' },
  boarding: { label: 'Embarquement', className: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800' },
  departed: { label: 'En route', className: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' },
  arrived: { label: 'Arrivé', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Annulé', className: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' },
  // Legacy statuses mapping
  scheduled: { label: 'Programmé', className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' },
  in_progress: { label: 'En route', className: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' },
  completed: { label: 'Arrivé', className: 'bg-muted text-muted-foreground border-border' },
};

// Status transitions
const statusTransitions: Record<string, { next: string; label: string; icon: React.ReactNode; color: string }[]> = {
  planned: [
    { next: 'boarding', label: 'Ouvrir embarquement', icon: <UserCheck className="w-4 h-4" />, color: 'text-yellow-600' },
    { next: 'cancelled', label: 'Annuler', icon: <XCircle className="w-4 h-4" />, color: 'text-destructive' },
  ],
  scheduled: [
    { next: 'boarding', label: 'Ouvrir embarquement', icon: <UserCheck className="w-4 h-4" />, color: 'text-yellow-600' },
    { next: 'cancelled', label: 'Annuler', icon: <XCircle className="w-4 h-4" />, color: 'text-destructive' },
  ],
  boarding: [
    { next: 'departed', label: 'Départ effectué', icon: <ArrowRight className="w-4 h-4" />, color: 'text-green-600' },
    { next: 'cancelled', label: 'Annuler', icon: <XCircle className="w-4 h-4" />, color: 'text-destructive' },
  ],
  departed: [
    { next: 'arrived', label: 'Marquer arrivé', icon: <CheckCircle className="w-4 h-4" />, color: 'text-muted-foreground' },
  ],
  in_progress: [
    { next: 'arrived', label: 'Marquer arrivé', icon: <CheckCircle className="w-4 h-4" />, color: 'text-muted-foreground' },
  ],
  arrived: [],
  completed: [],
  cancelled: [],
};

const Voyages = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [adminAgencyFilter, setAdminAgencyFilter] = React.useState('');

  const isAdmin = profile?.role === 'admin';
  const filterAgencyId = isAdmin 
    ? (adminAgencyFilter ? Number(adminAgencyFilter) : undefined)
    : profile?.agency_id || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['trips', filterAgencyId],
    queryFn: () => api.getTrips({ agency_id: filterAgencyId }),
  });

  // Fetch ticket counts for all trips
  const { data: ticketCounts } = useQuery({
    queryKey: ['trip-ticket-counts-voyages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('trip_id')
        .in('status', ['paid', 'reserved']);
      
      if (error) throw error;
      
      const counts: Record<number, number> = {};
      data?.forEach(ticket => {
        if (ticket.trip_id) {
          counts[ticket.trip_id] = (counts[ticket.trip_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const trips = data?.data || [];
  const filteredTrips = trips.filter(t => 
    t.route?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.vehicle?.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to get trip capacity
  const getTripCapacity = (trip: any) => {
    const capacity = trip.vehicle?.seats || 50;
    const soldCount = ticketCounts?.[trip.id] || 0;
    const remaining = capacity - soldCount;
    return { capacity, soldCount, remaining, isFull: remaining <= 0 };
  };

  // Stats
  const today = new Date().toISOString().split('T')[0];
  const todayTrips = trips.filter(t => t.departure_datetime?.startsWith(today));
  const plannedTrips = trips.filter(t => (t.status as string) === 'planned' || t.status === 'scheduled');
  const boardingTrips = trips.filter(t => (t.status as string) === 'boarding');
  const departedTrips = trips.filter(t => (t.status as string) === 'departed' || t.status === 'in_progress');

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ tripId, newStatus, oldStatus, routeName }: { tripId: number; newStatus: string; oldStatus: string; routeName: string }) => {
      const updateData: any = { status: newStatus };
      if (newStatus === 'arrived') {
        updateData.arrival_datetime = new Date().toISOString();
      }
      const { error } = await supabase.from('trips').update(updateData).eq('id', tripId);
      if (error) throw error;
      return { tripId, newStatus, oldStatus, routeName };
    },
    onSuccess: ({ tripId, newStatus, oldStatus, routeName }) => {
      audit.tripStatusChange(tripId, routeName, oldStatus, newStatus);
      const statusLabel = statusConfig[newStatus]?.label || newStatus;
      toast({ title: 'Statut mis à jour', description: `Le voyage est maintenant "${statusLabel}"` });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (trip: Trip) => {
      await api.deleteTrip(trip.id);
      return trip;
    },
    onSuccess: (trip) => {
      audit.tripDelete(trip.id, trip.route?.name || 'Voyage');
      toast({ title: 'Voyage supprimé' });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const handlePrintManifest = async (trip: Trip) => {
    try {
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('trip_id', trip.id)
        .eq('status', 'paid');

      if (error) throw error;

      generateTripManifestPdf(trip as any, tickets || []);
      toast({ title: 'Manifeste généré', description: 'Le PDF a été téléchargé.' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Voyages</h1>
            <p className="text-muted-foreground text-sm mt-1">Planifiez et gérez les départs</p>
          </div>
          <NewTripDialog 
            open={isDialogOpen} 
            onOpenChange={setIsDialogOpen}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['trips'] })}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aujourd'hui</p>
              <p className="text-xl font-bold text-card-foreground">{todayTrips.length}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Programmés</p>
              <p className="text-xl font-bold text-card-foreground">{plannedTrips.length}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Embarquement</p>
              <p className="text-xl font-bold text-card-foreground">{boardingTrips.length}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <Bus className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En route</p>
              <p className="text-xl font-bold text-card-foreground">{departedTrips.length}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-wrap gap-3 items-end">
          <AgencyFilter 
            value={adminAgencyFilter} 
            onChange={setAdminAgencyFilter}
            className="min-w-[180px]"
          />
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un voyage..." 
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm">
            Erreur lors du chargement des voyages.
          </div>
        )}

        {/* Voyages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-5">
                <Skeleton className="h-5 w-48 mb-3" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-40 mb-4" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          ) : (
            filteredTrips.map((trip, index) => {
              const status = statusConfig[trip.status as keyof typeof statusConfig] || statusConfig.scheduled;
              
              return (
                <div 
                  key={trip.id}
                  className="bg-card rounded-2xl border border-border p-5 hover:border-primary/30 hover:shadow-md transition-all duration-300 animate-fade-in group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-card-foreground truncate">
                        {trip.route?.name || `Voyage #${trip.id}`}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {trip.route?.departure_agency?.name || 'Départ'} → {trip.route?.arrival_agency?.name || 'Arrivée'}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] ml-2 flex-shrink-0', status.className)}>
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(trip.departure_datetime).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(trip.departure_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Capacity indicator */}
                  {(() => {
                    const { capacity, soldCount, remaining, isFull } = getTripCapacity(trip);
                    const fillPercentage = (soldCount / capacity) * 100;
                    return (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-lg font-bold text-card-foreground">
                            {trip.route?.base_price?.toLocaleString() || '—'} F
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className={cn(
                              'text-xs font-semibold',
                              isFull ? 'text-red-600' : remaining <= 5 ? 'text-orange-600' : 'text-green-600'
                            )}>
                              {soldCount}/{capacity}
                            </span>
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              isFull 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                : remaining <= 5 
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            )}>
                              {isFull ? 'COMPLET' : `${remaining} dispo`}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={cn(
                              'h-full transition-all',
                              isFull ? 'bg-red-500' : remaining <= 5 ? 'bg-orange-500' : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Status Actions */}
                  {(statusTransitions[trip.status as string] || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(statusTransitions[trip.status as string] || []).map((transition) => (
                        <Button
                          key={transition.next}
                          variant="outline"
                          size="sm"
                          className={cn('text-xs h-7 gap-1', transition.color)}
                          onClick={() => statusMutation.mutate({
                            tripId: trip.id,
                            newStatus: transition.next,
                            oldStatus: trip.status,
                            routeName: trip.route?.name || 'Voyage'
                          })}
                          disabled={statusMutation.isPending}
                        >
                          {transition.icon}
                          {transition.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {trip.vehicle && (
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {trip.vehicle.registration_number}
                        {trip.vehicle.brand && ` • ${trip.vehicle.brand}`}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => handlePrintManifest(trip)}
                          title="Imprimer le manifeste"
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer ce voyage ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(trip)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isLoading && filteredTrips.length === 0 && (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-card-foreground mb-2">
              Aucun voyage
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez votre premier voyage pour commencer.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Créer un voyage
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// New Trip Dialog
interface NewTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const NewTripDialog: React.FC<NewTripDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [routeId, setRouteId] = React.useState('');
  const [vehicleId, setVehicleId] = React.useState('');
  const [departureDate, setDepartureDate] = React.useState('');
  const [departureTime, setDepartureTime] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: routes } = useQuery({
    queryKey: ['routes'],
    queryFn: () => api.getRoutes(),
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const selectedRoute = routes?.find(r => r.id.toString() === routeId);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId || !vehicleId || !departureDate || !departureTime) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const departureDatetime = `${departureDate}T${departureTime}:00`;
      await api.createTrip({
        route_id: Number(routeId),
        vehicle_id: Number(vehicleId),
        departure_datetime: departureDatetime,
        status: 'scheduled',
      });

      toast({ title: 'Voyage créé', description: `Départ prévu le ${departureDate} à ${departureTime}` });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRouteId('');
    setVehicleId('');
    setDepartureDate('');
    setDepartureTime('');
    setNotes('');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau voyage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Création de voyage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Route & Vehicle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ligne *</Label>
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner une ligne" />
                </SelectTrigger>
                <SelectContent>
                  {routes?.map((route) => (
                    <SelectItem key={route.id} value={route.id.toString()}>
                      {route.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Véhicule *</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.registration_number} ({v.seats} places)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Route Info */}
          {selectedRoute && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <p className="font-semibold text-card-foreground">{selectedRoute.name}</p>
              <p className="text-muted-foreground mt-1">
                {selectedRoute.departure_agency?.name} → {selectedRoute.arrival_agency?.name}
              </p>
              <p className="text-muted-foreground">
                Prix de base: <span className="font-semibold text-card-foreground">{formatCurrency(selectedRoute.base_price)}</span>
              </p>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date de départ *</Label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={today}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Heure de départ *</Label>
              <Input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Infos complémentaires..."
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Info */}
          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            Ce voyage sera créé avec le statut <span className="font-semibold text-card-foreground">Programmé</span>.
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !routeId || !vehicleId || !departureDate || !departureTime}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {isSubmitting ? 'Création...' : 'Créer le voyage'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Voyages;
