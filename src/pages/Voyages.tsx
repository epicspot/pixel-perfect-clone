import { useQuery } from '@tanstack/react-query';
import { api, Voyage } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Plus, MapPin, Clock, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  active: { label: 'Actif', className: 'bg-success/10 text-success border-success/20' },
  completed: { label: 'Terminé', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Annulé', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const Voyages = () => {
  const { data: voyages, isLoading } = useQuery({
    queryKey: ['voyages'],
    queryFn: api.getVoyages,
  });

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
            voyages?.map((voyage, index) => {
              const occupancy = ((voyage.total_seats - voyage.available_seats) / voyage.total_seats) * 100;
              
              return (
                <div 
                  key={voyage.id}
                  className="bg-card rounded-xl border border-border p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-card-foreground">{voyage.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{voyage.departure} → {voyage.destination}</span>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", statusConfig[voyage.status].className)}
                    >
                      {statusConfig[voyage.status].label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{voyage.departure_time} - {voyage.arrival_time}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-display font-bold text-card-foreground">
                      {voyage.price.toLocaleString()} F
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className={cn(
                        "font-medium",
                        voyage.available_seats === 0 ? "text-destructive" : "text-card-foreground"
                      )}>
                        {voyage.available_seats} places
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Taux de remplissage</span>
                      <span className="font-medium text-card-foreground">{occupancy.toFixed(0)}%</span>
                    </div>
                    <Progress value={occupancy} className="h-2" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Voyages;
