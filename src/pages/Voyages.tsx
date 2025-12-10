import { useQuery } from '@tanstack/react-query';
import { api, Trip } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Plus, MapPin, Clock, Users, Calendar, Bus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  scheduled: { label: 'Programmé', className: 'bg-primary/10 text-primary border-primary/20' },
  in_progress: { label: 'En cours', className: 'bg-success/10 text-success border-success/20' },
  completed: { label: 'Terminé', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Annulé', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const Voyages = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.getTrips(),
  });

  const trips = data?.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Voyages</h1>
            <p className="text-muted-foreground mt-1">Gérez les lignes et les trajets</p>
          </div>
          <Button className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau voyage
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive">
            Erreur lors du chargement des voyages. Vérifiez votre connexion à l'API.
          </div>
        )}

        {/* Voyages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-4 w-40 mb-4" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))
          ) : (
            trips.map((trip, index) => {
              const status = statusConfig[trip.status] || statusConfig.scheduled;
              
              return (
                <div 
                  key={trip.id}
                  className="bg-card rounded-xl border border-border p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-card-foreground">
                        {trip.route?.name || `Voyage #${trip.id}`}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {trip.route?.departure_agency?.name || 'Départ'} → {trip.route?.arrival_agency?.name || 'Arrivée'}
                        </span>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", status.className)}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(trip.departure_datetime).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(trip.departure_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-display font-bold text-card-foreground">
                      {trip.route?.base_price?.toLocaleString() || '—'} F
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-card-foreground">
                        {trip.vehicle?.seats || '—'} places
                      </span>
                    </div>
                  </div>
                  
                  {trip.vehicle && (
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Véhicule: {trip.vehicle.registration_number}
                        {trip.vehicle.brand && ` - ${trip.vehicle.brand}`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isLoading && trips.length === 0 && (
          <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
            <Bus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">
              Aucun voyage
            </h3>
            <p className="text-sm text-muted-foreground">
              Les voyages apparaîtront ici une fois créés.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Voyages;
