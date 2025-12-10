import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface AgencyData {
  agency_id: number;
  agency_name: string;
  total_amount: number;
  tickets_count: number;
}

interface AgencyBreakdownProps {
  agencies?: AgencyData[];
  isLoading?: boolean;
}

export function AgencyBreakdown({ agencies, isLoading }: AgencyBreakdownProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
        <h3 className="font-display font-semibold text-lg mb-4">Ventes par agence (mois)</h3>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const maxAmount = agencies && agencies.length > 0 
    ? Math.max(...agencies.map(a => a.total_amount)) 
    : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-card-foreground">Ventes par agence (mois)</h3>
      </div>
      <div className="space-y-4">
        {agencies?.map((agency) => {
          const percentage = maxAmount > 0 ? (agency.total_amount / maxAmount) * 100 : 0;
          
          return (
            <div key={agency.agency_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-card-foreground">{agency.agency_name}</p>
                  <p className="text-xs text-muted-foreground">{agency.tickets_count} tickets</p>
                </div>
                <span className="font-semibold text-card-foreground">
                  {agency.total_amount.toLocaleString()} F
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
        {(!agencies || agencies.length === 0) && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucune donnée disponible
          </p>
        )}
      </div>
    </div>
  );
}
