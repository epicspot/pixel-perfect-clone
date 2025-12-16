import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bus, 
  MapPin, 
  Wrench, 
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle
} from 'lucide-react';

interface VehicleAvailabilityWidgetProps {
  agencyId?: number;
}

interface VehicleWithStatus {
  id: number;
  registration_number: string;
  brand: string | null;
  model: string | null;
  seats: number;
  status: string;
  agency_id: number | null;
  current_location: string | null;
  current_location_id: number | null;
  last_trip_date: string | null;
  is_on_trip: boolean;
  hours_idle: number | null;
}

export const VehicleAvailabilityWidget: React.FC<VehicleAvailabilityWidgetProps> = ({ agencyId }) => {
  const { profile } = useAuth();
  const role = profile?.role;

  const { data: vehiclesWithStatus, isLoading } = useQuery({
    queryKey: ['vehicles-availability-status', agencyId],
    queryFn: async () => {
      // Get all vehicles
      let vehicleQuery = supabase
        .from('vehicles')
        .select('id, registration_number, brand, model, seats, status, agency_id, agency:agencies(name)');
      
      if (agencyId) {
        vehicleQuery = vehicleQuery.eq('agency_id', agencyId);
      }
      
      const { data: vehicles } = await vehicleQuery;
      if (!vehicles) return [];

      // Get active trips (boarding, departed, in_progress)
      const { data: activeTrips } = await supabase
        .from('trips')
        .select('id, vehicle_id, status, departure_datetime')
        .in('status', ['boarding', 'departed', 'in_progress'])
        .not('vehicle_id', 'is', null);

      const activeVehicleIds = new Set(activeTrips?.map(t => t.vehicle_id) || []);

      // Get latest arrived trip per vehicle for location tracking
      const { data: latestArrivedTrips } = await supabase
        .from('trips')
        .select(`
          id, 
          vehicle_id, 
          arrival_datetime,
          departure_datetime,
          route:routes(arrival_agency_id, arrival_agency:agencies!routes_arrival_agency_id_fkey(name))
        `)
        .eq('status', 'arrived')
        .not('vehicle_id', 'is', null)
        .order('arrival_datetime', { ascending: false });

      // Map of vehicle_id to latest arrived trip
      const vehicleLastTrip = new Map<number, any>();
      latestArrivedTrips?.forEach(trip => {
        if (!vehicleLastTrip.has(trip.vehicle_id!)) {
          vehicleLastTrip.set(trip.vehicle_id!, trip);
        }
      });

      // Get agencies for home location names
      const { data: agencies } = await supabase
        .from('agencies')
        .select('id, name');
      
      const agencyMap = new Map(agencies?.map(a => [a.id, a.name]) || []);

      const now = new Date();

      return vehicles.map(vehicle => {
        const isOnTrip = activeVehicleIds.has(vehicle.id);
        const lastTrip = vehicleLastTrip.get(vehicle.id);
        
        // Determine current location
        let currentLocation: string | null = null;
        let currentLocationId: number | null = null;
        
        if (lastTrip?.route?.arrival_agency) {
          currentLocation = lastTrip.route.arrival_agency.name;
          currentLocationId = lastTrip.route.arrival_agency_id;
        } else if (vehicle.agency_id) {
          currentLocation = agencyMap.get(vehicle.agency_id) || null;
          currentLocationId = vehicle.agency_id;
        }

        // Calculate hours idle
        let hoursIdle: number | null = null;
        let lastTripDate: string | null = null;
        
        if (!isOnTrip && lastTrip?.arrival_datetime) {
          const lastArrival = new Date(lastTrip.arrival_datetime);
          hoursIdle = Math.floor((now.getTime() - lastArrival.getTime()) / (1000 * 60 * 60));
          lastTripDate = lastTrip.arrival_datetime;
        } else if (!isOnTrip && !lastTrip) {
          // Never had a trip, consider as idle since creation
          hoursIdle = 48; // Mark as long idle
        }

        return {
          id: vehicle.id,
          registration_number: vehicle.registration_number,
          brand: vehicle.brand,
          model: vehicle.model,
          seats: vehicle.seats,
          status: vehicle.status,
          agency_id: vehicle.agency_id,
          current_location: currentLocation,
          current_location_id: currentLocationId,
          last_trip_date: lastTripDate,
          is_on_trip: isOnTrip,
          hours_idle: hoursIdle,
        } as VehicleWithStatus;
      });
    },
    enabled: ['admin', 'manager', 'mechanic'].includes(role || ''),
  });

  if (!['admin', 'manager', 'mechanic'].includes(role || '')) {
    return null;
  }

  const getStatusInfo = (vehicle: VehicleWithStatus) => {
    if (vehicle.status === 'maintenance') {
      return { 
        label: 'En maintenance', 
        color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        icon: Wrench,
        iconColor: 'text-orange-500'
      };
    }
    if (vehicle.status === 'inactive') {
      return { 
        label: 'Inactif', 
        color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
        icon: XCircle,
        iconColor: 'text-gray-500'
      };
    }
    if (vehicle.is_on_trip) {
      return { 
        label: 'En voyage', 
        color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        icon: Bus,
        iconColor: 'text-blue-500'
      };
    }
    if (vehicle.hours_idle && vehicle.hours_idle > 24) {
      return { 
        label: `Immobilisé ${vehicle.hours_idle}h`, 
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        icon: AlertTriangle,
        iconColor: 'text-amber-500'
      };
    }
    return { 
      label: 'Disponible', 
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      icon: CheckCircle2,
      iconColor: 'text-emerald-500'
    };
  };

  // Summary stats
  const stats = {
    total: vehiclesWithStatus?.length || 0,
    available: vehiclesWithStatus?.filter(v => v.status === 'active' && !v.is_on_trip).length || 0,
    onTrip: vehiclesWithStatus?.filter(v => v.is_on_trip).length || 0,
    maintenance: vehiclesWithStatus?.filter(v => v.status === 'maintenance').length || 0,
    idle24h: vehiclesWithStatus?.filter(v => v.status === 'active' && !v.is_on_trip && v.hours_idle && v.hours_idle > 24).length || 0,
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border-border/50 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border/50 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Bus className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-card-foreground">Disponibilité des véhicules</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          {stats.total} véhicule(s)
        </span>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {stats.available} disponible(s)
        </Badge>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Bus className="w-3 h-3 mr-1" />
          {stats.onTrip} en voyage
        </Badge>
        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
          <Wrench className="w-3 h-3 mr-1" />
          {stats.maintenance} maintenance
        </Badge>
        {stats.idle24h > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {stats.idle24h} immobilisé(s) +24h
          </Badge>
        )}
      </div>

      {/* Vehicle list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {vehiclesWithStatus?.map(vehicle => {
          const statusInfo = getStatusInfo(vehicle);
          const StatusIcon = statusInfo.icon;
          
          return (
            <div 
              key={vehicle.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${statusInfo.color}`}>
                  <StatusIcon className={`w-4 h-4 ${statusInfo.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {vehicle.registration_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {vehicle.brand} {vehicle.model} • {vehicle.seats} places
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                  {statusInfo.label}
                </Badge>
                {vehicle.current_location && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                    <MapPin className="w-3 h-3" />
                    {vehicle.current_location}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        
        {(!vehiclesWithStatus || vehiclesWithStatus.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Bus className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun véhicule trouvé</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VehicleAvailabilityWidget;
