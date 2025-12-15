import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertTriangle, 
  Clock, 
  Wrench, 
  Bus, 
  Monitor,
  XCircle,
  ChevronRight,
  Bell
} from 'lucide-react';

interface ProactiveAlertsProps {
  agencyId?: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  icon: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export const ProactiveAlerts: React.FC<ProactiveAlertsProps> = ({ agencyId }) => {
  const { profile, user } = useAuth();
  const role = profile?.role;
  const userAgencyId = profile?.agency_id;
  const effectiveAgencyId = agencyId || userAgencyId;

  const today = new Date().toISOString().split('T')[0];

  // Query for unclosed sessions (for managers and admins)
  const { data: unclosedSessions } = useQuery({
    queryKey: ['unclosed-sessions-alert', effectiveAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('counter_sessions')
        .select('id, user_id, opened_at, counter:ticket_counters(name), agency:agencies(name)')
        .eq('status', 'open')
        .lt('opened_at', today + 'T00:00:00');
      
      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: ['admin', 'manager'].includes(role || ''),
  });

  // Query for open maintenance orders (for mechanics and admins)
  const { data: openMaintenance } = useQuery({
    queryKey: ['open-maintenance-alert', effectiveAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_orders')
        .select('id, title, status, vehicle:vehicles(registration_number)')
        .in('status', ['open', 'in_progress']);
      
      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: ['admin', 'mechanic', 'manager'].includes(role || ''),
  });

  // Query for trips without driver/vehicle (for managers and admins)
  const { data: incompleteTrips } = useQuery({
    queryKey: ['incomplete-trips-alert', effectiveAgencyId, today],
    queryFn: async () => {
      const { data: trips } = await supabase
        .from('trips')
        .select(`
          id, 
          departure_datetime, 
          driver_id, 
          vehicle_id,
          route:routes!inner(name, departure_agency_id)
        `)
        .gte('departure_datetime', today + 'T00:00:00')
        .in('status', ['planned', 'boarding']);

      const filtered = effectiveAgencyId
        ? trips?.filter((t: any) => t.route?.departure_agency_id === effectiveAgencyId)
        : trips;

      return filtered?.filter((t: any) => !t.driver_id || !t.vehicle_id) || [];
    },
    enabled: ['admin', 'manager'].includes(role || ''),
  });

  // Query for user's own unclosed session (for cashiers)
  const { data: ownUnclosedSession } = useQuery({
    queryKey: ['own-unclosed-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data } = await supabase
        .from('counter_sessions')
        .select('id, opened_at')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .lt('opened_at', today + 'T00:00:00')
        .maybeSingle();
      
      return data;
    },
    enabled: role === 'cashier',
  });

  // Query for cash discrepancy alerts (for managers and admins)
  const { data: unacknowledgedDiscrepancies } = useQuery({
    queryKey: ['unacknowledged-discrepancies', effectiveAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('cash_discrepancy_alerts')
        .select('id, difference, created_at')
        .is('acknowledged_at', null);
      
      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: ['admin', 'manager'].includes(role || ''),
  });

  // Query for vehicles in maintenance status
  const { data: vehiclesInMaintenance } = useQuery({
    queryKey: ['vehicles-in-maintenance', effectiveAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('id, registration_number, brand, model')
        .eq('status', 'maintenance');
      
      if (effectiveAgencyId) {
        query = query.eq('agency_id', effectiveAgencyId);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: ['admin', 'mechanic', 'manager'].includes(role || ''),
  });

  // Build alerts array
  const alerts: Alert[] = [];

  // Unclosed sessions from previous days
  if (unclosedSessions && unclosedSessions.length > 0) {
    alerts.push({
      id: 'unclosed-sessions',
      type: 'danger',
      icon: Monitor,
      title: `${unclosedSessions.length} session(s) non fermée(s)`,
      description: `Sessions de guichet ouvertes depuis hier ou avant`,
      action: {
        label: 'Voir les sessions',
        href: '/guichets'
      }
    });
  }

  // Own unclosed session (for cashiers)
  if (ownUnclosedSession) {
    alerts.push({
      id: 'own-unclosed-session',
      type: 'danger',
      icon: Monitor,
      title: 'Votre session est toujours ouverte',
      description: `Session ouverte depuis ${new Date(ownUnclosedSession.opened_at).toLocaleDateString('fr-FR')}`,
      action: {
        label: 'Fermer la session',
        href: '/guichets'
      }
    });
  }

  // Open maintenance orders
  if (openMaintenance && openMaintenance.length > 0) {
    const inProgress = openMaintenance.filter((m: any) => m.status === 'in_progress').length;
    const open = openMaintenance.filter((m: any) => m.status === 'open').length;
    
    alerts.push({
      id: 'open-maintenance',
      type: 'warning',
      icon: Wrench,
      title: `${openMaintenance.length} ordre(s) de maintenance`,
      description: `${open} en attente, ${inProgress} en cours`,
      action: {
        label: 'Gérer la maintenance',
        href: '/maintenance'
      }
    });
  }

  // Incomplete trips (no driver or vehicle)
  if (incompleteTrips && incompleteTrips.length > 0) {
    alerts.push({
      id: 'incomplete-trips',
      type: 'warning',
      icon: Bus,
      title: `${incompleteTrips.length} voyage(s) incomplet(s)`,
      description: 'Voyages du jour sans chauffeur ou véhicule assigné',
      action: {
        label: 'Compléter les voyages',
        href: '/voyages'
      }
    });
  }

  // Cash discrepancy alerts
  if (unacknowledgedDiscrepancies && unacknowledgedDiscrepancies.length > 0) {
    const totalDiff = unacknowledgedDiscrepancies.reduce((sum, d) => sum + Math.abs(d.difference), 0);
    alerts.push({
      id: 'cash-discrepancies',
      type: 'danger',
      icon: AlertTriangle,
      title: `${unacknowledgedDiscrepancies.length} écart(s) de caisse`,
      description: `Total des écarts: ${new Intl.NumberFormat('fr-FR').format(totalDiff)} F CFA`,
      action: {
        label: 'Voir les alertes',
        href: '/guichets'
      }
    });
  }

  // Vehicles in maintenance
  if (vehiclesInMaintenance && vehiclesInMaintenance.length > 0 && role === 'mechanic') {
    alerts.push({
      id: 'vehicles-maintenance',
      type: 'info',
      icon: Bus,
      title: `${vehiclesInMaintenance.length} véhicule(s) en maintenance`,
      description: vehiclesInMaintenance.slice(0, 3).map((v: any) => v.registration_number).join(', '),
      action: {
        label: 'Voir les véhicules',
        href: '/maintenance'
      }
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-500/10 border-red-500/30',
          icon: 'bg-red-500 text-white',
          text: 'text-red-700 dark:text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30',
          icon: 'bg-orange-500 text-white',
          text: 'text-orange-700 dark:text-orange-400'
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/30',
          icon: 'bg-blue-500 text-white',
          text: 'text-blue-700 dark:text-blue-400'
        };
    }
  };

  return (
    <div className="animate-fade-in" style={{ animationDelay: '0.12s' }}>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-destructive" />
        <h2 className="text-lg font-semibold text-foreground">Alertes</h2>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
          {alerts.length}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          const Icon = alert.icon;
          
          return (
            <Card 
              key={alert.id} 
              className={`p-4 border ${styles.bg} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${styles.icon} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm ${styles.text}`}>
                    {alert.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {alert.description}
                  </p>
                  {alert.action && (
                    <Link 
                      to={alert.action.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-2"
                    >
                      {alert.action.label}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProactiveAlerts;
