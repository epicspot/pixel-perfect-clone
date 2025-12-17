import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Trip } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, MapPin, Clock, Users, Calendar, Bus, Search, Pencil, Trash2, FileText, Play, UserCheck, ArrowRight, CheckCircle, XCircle, User, UserCog, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { setGlobalLoading } from '@/hooks/useLoadingProgress';
import { formatCurrency } from '@/lib/formatters';

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

// ID de l'agence Siège (central)
const SIEGE_AGENCY_ID = '4';

const Voyages = () => {
  const { profile } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingTrip, setEditingTrip] = React.useState<Trip | null>(null);
  const [replacingVehicleTrip, setReplacingVehicleTrip] = React.useState<Trip | null>(null);
  // Admin voit le Siège par défaut
  const [adminAgencyFilter, setAdminAgencyFilter] = React.useState(SIEGE_AGENCY_ID);

  const isAdmin = profile?.role === 'admin';
  // Use permissions from database
  const canCreateTrips = canCreate('voyages');
  const canEditTrips = canEdit('voyages');
  const canDeleteTrips = canDelete('voyages');
  const canManageTrips = canCreateTrips || canEditTrips;
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

  // Realtime subscription for trip arrivals - notify when vehicle is freed
  React.useEffect(() => {
    const channel = supabase
      .channel('trip-arrivals')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
        },
        async (payload) => {
          const newTrip = payload.new as any;
          const oldTrip = payload.old as any;
          
          // Check if status changed to 'arrived'
          if (newTrip.status === 'arrived' && oldTrip.status !== 'arrived') {
            // Fetch vehicle and route info
            const { data: tripData } = await supabase
              .from('trips')
              .select('vehicle:vehicles(registration_number), route:routes(name, arrival_agency:agencies(name))')
              .eq('id', newTrip.id)
              .single();
            
            if (tripData) {
              const vehicleReg = (tripData.vehicle as any)?.registration_number || 'Véhicule';
              const routeName = (tripData.route as any)?.name || '';
              const arrivalAgency = (tripData.route as any)?.arrival_agency?.name || '';
              
              toast({
                title: '🚌 Véhicule libéré',
                description: `${vehicleReg} est arrivé à ${arrivalAgency} (${routeName}). Le véhicule est maintenant disponible.`,
              });
              
              // Invalidate queries to refresh vehicle availability
              queryClient.invalidateQueries({ queryKey: ['vehicles-on-active-trips'] });
              queryClient.invalidateQueries({ queryKey: ['vehicle-current-locations'] });
              queryClient.invalidateQueries({ queryKey: ['trips'] });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handlePrintManifest = async (trip: Trip) => {
    try {
      // Fetch tickets
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('trip_id', trip.id)
        .eq('status', 'paid');

      if (error) throw error;

      // Fetch company settings
      const { data: settings } = await supabase
        .from('company_settings')
        .select('company_name, logo_url, address, phone, email, rccm, ifu')
        .single();

      generateTripManifestPdf(trip as any, tickets || [], {
        name: settings?.company_name || 'Transport Express',
        logoUrl: settings?.logo_url,
        address: settings?.address || '',
        phone: settings?.phone || '',
        email: settings?.email || '',
        rccm: settings?.rccm || '',
        ifu: settings?.ifu || '',
      });
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
          {canCreateTrips && (
            <NewTripDialog 
              open={isDialogOpen} 
              onOpenChange={setIsDialogOpen}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['trips'] })}
            />
          )}
        </div>

        {/* Read-only alert for users without permissions */}
        {!canCreateTrips && !canEditTrips && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
            <Bus className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-800 dark:text-blue-200">Consultation uniquement</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Vous n'avez pas les droits pour créer ou modifier les voyages.
              </p>
            </div>
          </div>
        )}

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
                    {trip.vehicle && (
                      <div className="flex items-center gap-1.5">
                        <Bus className="w-3 h-3" />
                        <span className="font-medium">{trip.vehicle.registration_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Driver and Assistant with quick edit */}
                  <CrewQuickEdit 
                    trip={trip} 
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['trips'] })} 
                  />

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
                      {(statusTransitions[trip.status as string] || []).map((transition) => {
                        // Check if user can mark as arrived (must be at destination agency)
                        const canMarkArrived = transition.next !== 'arrived' || 
                          isAdmin || 
                          profile?.agency_id === trip.route?.arrival_agency?.id;

                        if (!canMarkArrived) {
                          return (
                            <Button
                              key={transition.next}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 gap-1 text-muted-foreground cursor-not-allowed opacity-50"
                              disabled
                              title="Seule l'agence de destination peut marquer l'arrivée"
                            >
                              {transition.icon}
                              {transition.label}
                            </Button>
                          );
                        }

                        return (
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
                        );
                      })}
                    </div>
                  )}
                  
                  {trip.vehicle && (
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {trip.vehicle.registration_number}
                        {trip.vehicle.brand && ` • ${trip.vehicle.brand}`}
                      </p>
                      <div className="flex items-center gap-1">
                        {/* Replacement vehicle button - shown for departed or boarding trips */}
                        {canEditTrips && ['departed', 'in_progress', 'boarding'].includes(trip.status) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={() => setReplacingVehicleTrip(trip)}
                            title="Panne - Véhicule de remplacement"
                          >
                            <AlertTriangle className="w-3 h-3" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => handlePrintManifest(trip)}
                          title="Imprimer le manifeste"
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                        {canEditTrips && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => setEditingTrip(trip)}
                            title="Modifier le voyage"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                        {canDeleteTrips && (
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
                        )}
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
              {canCreateTrips ? "Créez votre premier voyage pour commencer." : "Aucun voyage programmé pour le moment."}
            </p>
            {canCreateTrips && (
              <Button onClick={() => setIsDialogOpen(true)} className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Créer un voyage
              </Button>
            )}
          </div>
        )}
        {/* Edit Trip Dialog */}
        <EditTripDialog 
          trip={editingTrip}
          open={!!editingTrip}
          onOpenChange={(open) => !open && setEditingTrip(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            setEditingTrip(null);
          }}
        />

        {/* Replace Vehicle Dialog */}
        <ReplaceVehicleDialog
          trip={replacingVehicleTrip}
          open={!!replacingVehicleTrip}
          onOpenChange={(open) => !open && setReplacingVehicleTrip(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            setReplacingVehicleTrip(null);
          }}
        />
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
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const userAgencyId = profile?.agency_id;

  const [routeId, setRouteId] = React.useState('');
  const [vehicleId, setVehicleId] = React.useState('');
  const [driverId, setDriverId] = React.useState('');
  const [assistantId, setAssistantId] = React.useState('');
  const [departureDate, setDepartureDate] = React.useState('');
  const [departureTime, setDepartureTime] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: allRoutes } = useQuery({
    queryKey: ['routes'],
    queryFn: () => api.getRoutes(),
  });

  // Filter routes: exclude routes departing from Siège (administrative only)
  const routes = React.useMemo(() => {
    if (!allRoutes) return [];
    return allRoutes.filter(r => r.departure_agency_id !== Number(SIEGE_AGENCY_ID));
  }, [allRoutes]);

  // Fetch vehicles
  const { data: allVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  // Fetch latest arrived trips to determine vehicle current locations
  const { data: vehicleLocations } = useQuery({
    queryKey: ['vehicle-current-locations'],
    queryFn: async () => {
      // Get the most recent arrived trip for each vehicle
      const { data, error } = await supabase
        .from('trips')
        .select(`
          vehicle_id,
          status,
          route:routes(arrival_agency_id)
        `)
        .eq('status', 'arrived')
        .order('arrival_datetime', { ascending: false });
      
      if (error) throw error;
      
      // Build a map of vehicle_id -> current_agency_id (based on latest arrived trip)
      const locationMap: Record<number, number> = {};
      data?.forEach(trip => {
        if (trip.vehicle_id && !locationMap[trip.vehicle_id]) {
          locationMap[trip.vehicle_id] = (trip.route as any)?.arrival_agency_id;
        }
      });
      return locationMap;
    },
  });

  // Fetch vehicles currently on active trips (boarding or departed) with trip info
  const { data: vehiclesOnActiveTrips } = useQuery({
    queryKey: ['vehicles-on-active-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('vehicle_id, status, route:routes(name)')
        .in('status', ['boarding', 'departed', 'in_progress']);
      
      if (error) throw error;
      
      // Return a Map of vehicle IDs -> trip status info
      const activeVehicles = new Map<number, { status: string; routeName: string }>();
      data?.forEach(trip => {
        if (trip.vehicle_id) {
          activeVehicles.set(trip.vehicle_id, {
            status: trip.status,
            routeName: (trip.route as any)?.name || 'Voyage en cours'
          });
        }
      });
      return activeVehicles;
    },
  });

  // Get the departure agency of selected route for vehicle filtering
  const routeForVehicleFilter = routes?.find(r => r.id.toString() === routeId);
  const departureAgencyId = routeForVehicleFilter?.departure_agency_id;

  // Type for vehicle with availability status
  type VehicleWithStatus = {
    vehicle: typeof allVehicles extends (infer T)[] | undefined ? T : never;
    available: boolean;
    unavailableReason?: string;
  };

  // Get all vehicles with availability status
  const vehiclesWithStatus = React.useMemo((): VehicleWithStatus[] => {
    if (!allVehicles) return [];
    
    return allVehicles.map(v => {
      // Check if vehicle is on an active trip
      const activeTrip = vehiclesOnActiveTrips?.get(v.id);
      if (activeTrip) {
        const statusLabel = activeTrip.status === 'boarding' ? 'Embarquement' : 'En route';
        return {
          vehicle: v,
          available: false,
          unavailableReason: `${statusLabel} - ${activeTrip.routeName}`
        };
      }

      // Check if vehicle is in maintenance
      if (v.status === 'maintenance') {
        return {
          vehicle: v,
          available: false,
          unavailableReason: 'En maintenance'
        };
      }

      // Check if vehicle is inactive
      if (v.status === 'inactive') {
        return {
          vehicle: v,
          available: false,
          unavailableReason: 'Inactif'
        };
      }
      
      // Check location availability
      if (departureAgencyId) {
        const currentLocation = vehicleLocations?.[v.id] || v.agency_id;
        if (currentLocation !== departureAgencyId && v.agency_id !== Number(SIEGE_AGENCY_ID)) {
          return {
            vehicle: v,
            available: false,
            unavailableReason: 'Pas à cette agence'
          };
        }
      }
      
      // Vehicle is available
      return { vehicle: v, available: true };
    }).sort((a, b) => {
      // Sort: available first, then by registration number
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.vehicle.registration_number.localeCompare(b.vehicle.registration_number);
    });
  }, [allVehicles, vehicleLocations, vehiclesOnActiveTrips, departureAgencyId]);

  // Filter to only available vehicles for selection
  const availableVehicles = vehiclesWithStatus.filter(v => v.available);

  // Fetch drivers and assistants from staff table
  const { data: allStaff } = useQuery({
    queryKey: ['staff-for-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, full_name, staff_type, agency_id, agency:agencies(name)')
        .eq('is_active', true)
        .in('staff_type', ['driver', 'assistant'])
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Filter staff: admin sees all, others see their agency + Siège
  const filteredStaff = React.useMemo(() => {
    if (!allStaff) return [];
    if (isAdmin) return allStaff;
    return allStaff.filter(s => 
      s.agency_id === userAgencyId || s.agency_id === Number(SIEGE_AGENCY_ID)
    );
  }, [allStaff, isAdmin, userAgencyId]);

  const drivers = filteredStaff?.filter(s => s.staff_type === 'driver') || [];
  const assistants = filteredStaff?.filter(s => s.staff_type === 'assistant') || [];

  const selectedRoute = routes?.find(r => r.id.toString() === routeId);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeId || !vehicleId || !departureDate || !departureTime) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setGlobalLoading(true);
    try {
      const departureDatetime = `${departureDate}T${departureTime}:00`;
      
      const { error } = await supabase.from('trips').insert({
        route_id: Number(routeId),
        vehicle_id: Number(vehicleId),
        driver_id: driverId ? Number(driverId) : null,
        assistant_id: assistantId ? Number(assistantId) : null,
        departure_datetime: departureDatetime,
        status: 'planned',
        notes: notes || null,
      });

      if (error) throw error;

      audit.tripCreate(0, selectedRoute?.name || 'Nouveau voyage');
      toast({ title: 'Voyage créé', description: `Départ prévu le ${departureDate} à ${departureTime}` });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setGlobalLoading(false);
    }
  };

  const resetForm = () => {
    setRouteId('');
    setVehicleId('');
    setDriverId('');
    setAssistantId('');
    setDepartureDate('');
    setDepartureTime('');
    setNotes('');
  };


  const getStaffName = (s: any) => s.full_name || `${s.first_name} ${s.last_name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau voyage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                  {vehiclesWithStatus?.map(({ vehicle: v, available, unavailableReason }) => (
                    <SelectItem 
                      key={v.id} 
                      value={v.id.toString()}
                      disabled={!available}
                      className={cn(!available && "opacity-50")}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(!available && "line-through")}>
                          {v.registration_number} ({v.seats} places)
                        </span>
                        {!available && (
                          <span className="text-[10px] text-destructive font-medium">
                            • {unavailableReason}
                          </span>
                        )}
                      </div>
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

          {/* Driver & Assistant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Chauffeur</Label>
              <Select value={driverId || "_none"} onValueChange={(v) => setDriverId(v === "_none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Non assigné</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {getStaffName(d)} {(d.agency as any)?.name ? `(${(d.agency as any).name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assistant</Label>
              <Select value={assistantId || "_none"} onValueChange={(v) => setAssistantId(v === "_none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un assistant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Non assigné</SelectItem>
                  {assistants.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {getStaffName(a)} {(a.agency as any)?.name ? `(${(a.agency as any).name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              isLoading={isSubmitting}
              className="flex-1 bg-primary text-primary-foreground"
            >
              Créer le voyage
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit Trip Dialog
interface EditTripDialogProps {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EditTripDialog: React.FC<EditTripDialogProps> = ({ trip, open, onOpenChange, onSuccess }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const userAgencyId = profile?.agency_id;

  const [routeId, setRouteId] = React.useState('');
  const [vehicleId, setVehicleId] = React.useState('');
  const [driverId, setDriverId] = React.useState('');
  const [assistantId, setAssistantId] = React.useState('');
  const [departureDate, setDepartureDate] = React.useState('');
  const [departureTime, setDepartureTime] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Initialize form when trip changes
  React.useEffect(() => {
    if (trip) {
      setRouteId(trip.route_id?.toString() || '');
      setVehicleId(trip.vehicle_id?.toString() || '');
      setDriverId((trip as any).driver_id?.toString() || '');
      setAssistantId((trip as any).assistant_id?.toString() || '');
      const dt = new Date(trip.departure_datetime);
      setDepartureDate(dt.toISOString().split('T')[0]);
      setDepartureTime(dt.toTimeString().slice(0, 5));
      setNotes((trip as any).notes || '');
    }
  }, [trip]);

  const { data: allRoutes } = useQuery({
    queryKey: ['routes'],
    queryFn: () => api.getRoutes(),
  });

  // Filter routes: exclude routes departing from Siège (administrative only)
  const routes = React.useMemo(() => {
    if (!allRoutes) return [];
    return allRoutes.filter(r => r.departure_agency_id !== Number(SIEGE_AGENCY_ID));
  }, [allRoutes]);

  const { data: allVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  // Fetch latest arrived trips to determine vehicle current locations
  const { data: vehicleLocations } = useQuery({
    queryKey: ['vehicle-current-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          vehicle_id,
          status,
          route:routes(arrival_agency_id)
        `)
        .eq('status', 'arrived')
        .order('arrival_datetime', { ascending: false });
      
      if (error) throw error;
      
      const locationMap: Record<number, number> = {};
      data?.forEach(trip => {
        if (trip.vehicle_id && !locationMap[trip.vehicle_id]) {
          locationMap[trip.vehicle_id] = (trip.route as any)?.arrival_agency_id;
        }
      });
      return locationMap;
    },
  });

  const routeForVehicleFilter = routes?.find(r => r.id.toString() === routeId);
  const departureAgencyId = routeForVehicleFilter?.departure_agency_id;

  const vehicles = React.useMemo(() => {
    if (!allVehicles) return [];
    
    return allVehicles.filter(v => {
      // Vehicles from Siège are always available
      if (v.agency_id === Number(SIEGE_AGENCY_ID)) return true;
      
      // If no route selected, show all for admin or user's agency
      if (!departureAgencyId) {
        if (isAdmin) return true;
        return v.agency_id === userAgencyId || v.agency_id === Number(SIEGE_AGENCY_ID);
      }
      
      // Determine vehicle's current location
      const currentLocation = vehicleLocations?.[v.id] || v.agency_id;
      
      // Show vehicle if it's currently at the departure agency
      return currentLocation === departureAgencyId;
    });
  }, [allVehicles, vehicleLocations, departureAgencyId, isAdmin, userAgencyId]);

  const { data: allStaff } = useQuery({
    queryKey: ['staff-for-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, full_name, staff_type, agency_id, agency:agencies(name)')
        .eq('is_active', true)
        .in('staff_type', ['driver', 'assistant'])
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredStaff = React.useMemo(() => {
    if (!allStaff) return [];
    if (isAdmin) return allStaff;
    return allStaff.filter(s => 
      s.agency_id === userAgencyId || s.agency_id === Number(SIEGE_AGENCY_ID)
    );
  }, [allStaff, isAdmin, userAgencyId]);

  const drivers = filteredStaff?.filter(s => s.staff_type === 'driver') || [];
  const assistants = filteredStaff?.filter(s => s.staff_type === 'assistant') || [];

  const selectedRoute = routes?.find(r => r.id.toString() === routeId);

  const getStaffName = (s: any) => s.full_name || `${s.first_name} ${s.last_name}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !routeId || !vehicleId || !departureDate || !departureTime) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const departureDatetime = `${departureDate}T${departureTime}:00`;
      const { error } = await supabase
        .from('trips')
        .update({
          route_id: Number(routeId),
          vehicle_id: Number(vehicleId),
          driver_id: driverId ? Number(driverId) : null,
          assistant_id: assistantId ? Number(assistantId) : null,
          departure_datetime: departureDatetime,
          notes: notes || null,
        })
        .eq('id', trip.id);

      if (error) throw error;

      toast({ title: 'Voyage modifié', description: `Modifications enregistrées` });
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le voyage</DialogTitle>
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

          {/* Driver & Assistant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Chauffeur</Label>
              <Select value={driverId || "_none"} onValueChange={(v) => setDriverId(v === "_none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Non assigné</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {getStaffName(d)} {(d.agency as any)?.name ? `(${(d.agency as any).name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assistant</Label>
              <Select value={assistantId || "_none"} onValueChange={(v) => setAssistantId(v === "_none" ? "" : v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un assistant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Non assigné</SelectItem>
                  {assistants.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {getStaffName(a)} {(a.agency as any)?.name ? `(${(a.agency as any).name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date de départ *</Label>
              <Input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
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
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Crew Quick Edit Component
interface CrewQuickEditProps {
  trip: Trip;
  onSuccess: () => void;
}

const CrewQuickEdit: React.FC<CrewQuickEditProps> = ({ trip, onSuccess }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const userAgencyId = profile?.agency_id;

  const [isOpen, setIsOpen] = React.useState(false);
  const [driverId, setDriverId] = React.useState('');
  const [assistantId, setAssistantId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDriverId((trip as any).driver_id?.toString() || '');
      setAssistantId((trip as any).assistant_id?.toString() || '');
    }
  }, [isOpen, trip]);

  const { data: allStaff } = useQuery({
    queryKey: ['staff-for-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, full_name, staff_type, agency_id, agency:agencies(name)')
        .eq('is_active', true)
        .in('staff_type', ['driver', 'assistant'])
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredStaff = React.useMemo(() => {
    if (!allStaff) return [];
    if (isAdmin) return allStaff;
    return allStaff.filter(s => 
      s.agency_id === userAgencyId || s.agency_id === Number(SIEGE_AGENCY_ID)
    );
  }, [allStaff, isAdmin, userAgencyId]);

  const drivers = filteredStaff?.filter(s => s.staff_type === 'driver') || [];
  const assistants = filteredStaff?.filter(s => s.staff_type === 'assistant') || [];

  const getStaffName = (s: any) => s.full_name || `${s.first_name} ${s.last_name}`;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({
          driver_id: driverId ? Number(driverId) : null,
          assistant_id: assistantId ? Number(assistantId) : null,
        })
        .eq('id', trip.id);

      if (error) throw error;

      toast({ title: 'Équipage mis à jour' });
      onSuccess();
      setIsOpen(false);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 text-xs mb-3 pb-3 border-b border-border">
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground flex-1 min-w-0">
        {trip.driver ? (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground truncate">
              {trip.driver.full_name || `${trip.driver.first_name} ${trip.driver.last_name}`}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground italic">Pas de chauffeur</span>
        )}
        {trip.assistant ? (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-orange-500 flex-shrink-0" />
            <span className="font-medium text-foreground truncate">
              {trip.assistant.full_name || `${trip.assistant.first_name} ${trip.assistant.last_name}`}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground italic">Pas d'assistant</span>
        )}
      </div>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
            <UserCog className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="end">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Modifier l'équipage</h4>
            
            <div>
              <Label className="text-xs">Chauffeur</Label>
              <Select value={driverId || "_none"} onValueChange={(v) => setDriverId(v === "_none" ? "" : v)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Non assigné</SelectItem>
                  {drivers.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {getStaffName(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-xs">Assistant</Label>
              <Select value={assistantId || "_none"} onValueChange={(v) => setAssistantId(v === "_none" ? "" : v)}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Non assigné</SelectItem>
                  {assistants.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {getStaffName(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-7 text-xs"
                onClick={() => setIsOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                size="sm" 
                className="flex-1 h-7 text-xs"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Replace Vehicle Dialog (for breakdown situations)
interface ReplaceVehicleDialogProps {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const ReplaceVehicleDialog: React.FC<ReplaceVehicleDialogProps> = ({ trip, open, onOpenChange, onSuccess }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const userAgencyId = profile?.agency_id;

  const [vehicleId, setVehicleId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setVehicleId('');
      setReason('');
    }
  }, [open]);

  // Fetch all vehicles
  const { data: allVehicles } = useQuery({
    queryKey: ['vehicles-for-replacement'],
    queryFn: () => api.getVehicles(),
    enabled: open,
  });

  // Fetch vehicle current locations
  const { data: vehicleLocations } = useQuery({
    queryKey: ['vehicle-current-locations-replacement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          vehicle_id,
          status,
          route:routes(arrival_agency_id)
        `)
        .eq('status', 'arrived')
        .order('arrival_datetime', { ascending: false });
      
      if (error) throw error;
      
      const locationMap: Record<number, number> = {};
      data?.forEach(t => {
        if (t.vehicle_id && !locationMap[t.vehicle_id]) {
          locationMap[t.vehicle_id] = (t.route as any)?.arrival_agency_id;
        }
      });
      return locationMap;
    },
    enabled: open,
  });

  // Fetch agencies to display locations
  const { data: agencies } = useQuery({
    queryKey: ['agencies-for-replacement'],
    queryFn: () => api.getAgencies(),
    enabled: open,
  });

  // Filter available vehicles (exclude current vehicle, show Siège + available vehicles)
  const availableVehicles = React.useMemo(() => {
    if (!allVehicles || !trip) return [];
    
    return allVehicles.filter(v => {
      // Exclude current vehicle
      if (v.id === trip.vehicle_id) return false;
      
      // Exclude vehicles in maintenance
      if (v.status === 'maintenance' || v.status === 'inactive') return false;
      
      // Vehicles from Siège are always available
      if (v.agency_id === Number(SIEGE_AGENCY_ID)) return true;
      
      // Admin sees all
      if (isAdmin) return true;
      
      // User sees their agency + Siège
      return v.agency_id === userAgencyId || v.agency_id === Number(SIEGE_AGENCY_ID);
    });
  }, [allVehicles, trip, isAdmin, userAgencyId]);

  // Get vehicle location display
  const getVehicleLocation = (vehicle: any) => {
    const currentLocation = vehicleLocations?.[vehicle.id] || vehicle.agency_id;
    const agency = agencies?.find(a => a.id === currentLocation);
    return agency?.name || 'Inconnu';
  };

  const handleSubmit = async () => {
    if (!trip || !vehicleId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ vehicle_id: Number(vehicleId) })
        .eq('id', trip.id);

      if (error) throw error;

      // Log audit - use logAudit directly for custom description
      const { logAudit } = await import('@/lib/audit');
      await logAudit({
        action: 'TRIP_UPDATE',
        entityType: 'trip',
        entityId: trip.id,
        description: `Véhicule de remplacement assigné (panne) pour voyage ${trip.route?.name || 'N/A'}. Raison: ${reason || 'Non spécifiée'}`,
      });

      toast({
        title: 'Véhicule remplacé',
        description: 'Le véhicule de remplacement a été assigné au voyage.',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            Véhicule de remplacement
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {trip && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium">{trip.route?.name}</p>
              <p className="text-xs text-muted-foreground">
                Véhicule actuel: {trip.vehicle?.registration_number}
                {trip.vehicle?.brand && ` (${trip.vehicle.brand})`}
              </p>
            </div>
          )}

          <div>
            <Label className="text-sm">Nouveau véhicule *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {availableVehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {v.registration_number} {v.brand && `(${v.brand})`} • {v.seats} places • {getVehicleLocation(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableVehicles.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Aucun véhicule disponible
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm">Raison du remplacement</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Décrivez la panne ou la raison du remplacement..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!vehicleId || isSubmitting}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? 'Enregistrement...' : 'Remplacer le véhicule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Voyages;
