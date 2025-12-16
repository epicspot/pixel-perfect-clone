import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  MapPin, 
  ArrowRight, 
  Calendar, 
  Clock,
  Bus,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface VehicleHistoryTimelineProps {
  vehicleId: number;
  vehicleRegistration: string;
}

interface TripEvent {
  id: number;
  departure_datetime: string;
  arrival_datetime: string | null;
  status: string;
  departure_agency: string | null;
  arrival_agency: string | null;
  route_name: string | null;
  driver_name: string | null;
}

export const VehicleHistoryTimeline: React.FC<VehicleHistoryTimelineProps> = ({ 
  vehicleId, 
  vehicleRegistration 
}) => {
  const { data: trips, isLoading } = useQuery({
    queryKey: ['vehicle-trip-history', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          departure_datetime,
          arrival_datetime,
          status,
          route:routes(
            name,
            departure_agency:agencies!routes_departure_agency_id_fkey(name),
            arrival_agency:agencies!routes_arrival_agency_id_fkey(name)
          ),
          driver:staff!trips_driver_id_fkey(first_name, last_name)
        `)
        .eq('vehicle_id', vehicleId)
        .order('departure_datetime', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((trip: any) => ({
        id: trip.id,
        departure_datetime: trip.departure_datetime,
        arrival_datetime: trip.arrival_datetime,
        status: trip.status,
        departure_agency: trip.route?.departure_agency?.name || null,
        arrival_agency: trip.route?.arrival_agency?.name || null,
        route_name: trip.route?.name || null,
        driver_name: trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : null,
      })) as TripEvent[];
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      planned: { label: 'Planifié', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
      boarding: { label: 'Embarquement', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      departed: { label: 'En route', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      in_progress: { label: 'En cours', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      arrived: { label: 'Arrivé', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      cancelled: { label: 'Annulé', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    };
    const config = statusConfig[status] || statusConfig.planned;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'arrived':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'departed':
      case 'in_progress':
        return <Bus className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bus className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">
          Historique des déplacements - {vehicleRegistration}
        </h3>
      </div>

      {(!trips || trips.length === 0) ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bus className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun voyage enregistré pour ce véhicule</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {trips.map((trip, index) => (
                <div key={trip.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className="absolute left-2 top-2 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    {getStatusIcon(trip.status)}
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors">
                    {/* Date header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(trip.departure_datetime), 'EEEE d MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      {getStatusBadge(trip.status)}
                    </div>

                    {/* Route info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {trip.departure_agency || 'Inconnu'}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium text-foreground truncate">
                          {trip.arrival_agency || 'Inconnu'}
                        </span>
                        <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                      </div>
                    </div>

                    {/* Time info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Départ: {format(new Date(trip.departure_datetime), 'HH:mm', { locale: fr })}
                        </span>
                      </div>
                      {trip.arrival_datetime && (
                        <span>
                          Arrivée: {format(new Date(trip.arrival_datetime), 'HH:mm', { locale: fr })}
                        </span>
                      )}
                    </div>

                    {/* Driver info */}
                    {trip.driver_name && (
                      <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        Chauffeur: {trip.driver_name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default VehicleHistoryTimeline;
