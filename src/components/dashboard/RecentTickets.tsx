import { Skeleton } from '@/components/ui/skeleton';

interface RecentTicket {
  id: number;
  sold_at: string;
  price: number;
  payment_method: string;
  customer_name: string;
  agency_name: string;
}

interface RecentTicketsProps {
  tickets?: RecentTicket[];
  isLoading?: boolean;
}

export function RecentTickets({ tickets, isLoading }: RecentTicketsProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <h3 className="font-display font-semibold text-lg mb-4">Dernières ventes</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Espèces',
      mobile_money: 'Mobile Money',
      card: 'Carte',
      transfer: 'Virement',
    };
    return methods[method] || method;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-card-foreground">Dernières ventes</h3>
        <a href="/tickets" className="text-sm text-primary hover:underline">Voir tout</a>
      </div>
      <div className="space-y-1">
        {tickets?.slice(0, 6).map((ticket) => (
          <div 
            key={ticket.id}
            className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">#{ticket.id}</span>
              </div>
              <div>
                <p className="font-medium text-card-foreground">{ticket.customer_name}</p>
                <p className="text-sm text-muted-foreground">{ticket.agency_name}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-card-foreground">
                {ticket.price.toLocaleString()} F
              </span>
              <p className="text-xs text-muted-foreground">
                {formatPaymentMethod(ticket.payment_method)}
              </p>
            </div>
          </div>
        ))}
        {(!tickets || tickets.length === 0) && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucune vente récente
          </p>
        )}
      </div>
    </div>
  );
}
