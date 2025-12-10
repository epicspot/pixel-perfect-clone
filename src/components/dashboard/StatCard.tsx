import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  delay?: number;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel,
  variant = 'default',
  delay = 0 
}: StatCardProps) {
  const isPositive = trend && trend > 0;

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "bg-card border border-border",
        "animate-slide-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-display font-bold text-card-foreground">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span className={cn(
                "font-medium",
                isPositive ? "text-success" : "text-destructive"
              )}>
                {isPositive ? '+' : ''}{trend}%
              </span>
              {trendLabel && (
                <span className="text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          variant === 'primary' && "gradient-primary",
          variant === 'secondary' && "gradient-secondary",
          variant === 'accent' && "bg-accent",
          variant === 'default' && "bg-muted"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            variant === 'default' ? "text-muted-foreground" : "text-primary-foreground"
          )} />
        </div>
      </div>
      
      {/* Decorative element */}
      <div className={cn(
        "absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-5",
        variant === 'primary' && "gradient-primary",
        variant === 'secondary' && "gradient-secondary",
        variant === 'accent' && "bg-accent",
        variant === 'default' && "bg-foreground"
      )} />
    </div>
  );
}
