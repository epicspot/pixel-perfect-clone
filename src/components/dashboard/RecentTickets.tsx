import { useQuery } from '@tanstack/react-query';
import { api, Ticket } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  confirmed: { label: 'Confirmé', className: 'bg-success/10 text-success border-success/20' },
  pending: { label: 'En attente', className: 'bg-warning/10 text-warning border-warning/20' },
  cancelled: { label: 'Annulé', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function RecentTickets() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: api.getTickets,
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h3 className="font-display font-semibold text-lg mb-4">Tickets récents</h3>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-card-foreground">Tickets récents</h3>
        <a href="/tickets" className="text-sm text-primary hover:underline">Voir tout</a>
      </div>
      <div className="space-y-1">
        {tickets?.slice(0, 5).map((ticket) => (
          <div 
            key={ticket.id}
            className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{ticket.reference.slice(-3)}</span>
              </div>
              <div>
                <p className="font-medium text-card-foreground">{ticket.passenger}</p>
                <p className="text-sm text-muted-foreground">{ticket.departure} → {ticket.destination}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-card-foreground">{ticket.price.toLocaleString()} F</span>
              <Badge 
                variant="outline" 
                className={cn("text-xs", statusConfig[ticket.status].className)}
              >
                {statusConfig[ticket.status].label}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
