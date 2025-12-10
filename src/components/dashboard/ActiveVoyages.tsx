import { useQuery } from '@tanstack/react-query';
import { api, Voyage } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock } from 'lucide-react';

export function ActiveVoyages() {
  const { data: voyages, isLoading } = useQuery({
    queryKey: ['voyages'],
    queryFn: api.getVoyages,
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <h3 className="font-display font-semibold text-lg mb-4">Voyages actifs</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const activeVoyages = voyages?.filter(v => v.status === 'active') || [];

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-card-foreground">Voyages actifs</h3>
        <a href="/voyages" className="text-sm text-primary hover:underline">Voir tout</a>
      </div>
      <div className="space-y-4">
        {activeVoyages.slice(0, 4).map((voyage) => {
          const occupancy = ((voyage.total_seats - voyage.available_seats) / voyage.total_seats) * 100;
          
          return (
            <div 
              key={voyage.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-card-foreground">{voyage.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{voyage.departure} → {voyage.destination}</span>
                  </div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Actif
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{voyage.departure_time} - {voyage.arrival_time}</span>
                </div>
                <span className="font-semibold text-card-foreground">{voyage.price.toLocaleString()} F</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Occupation</span>
                  <span className="font-medium text-card-foreground">
                    {voyage.total_seats - voyage.available_seats}/{voyage.total_seats} places
                  </span>
                </div>
                <Progress 
                  value={occupancy} 
                  className="h-2"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
