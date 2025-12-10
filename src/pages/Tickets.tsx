import { useQuery } from '@tanstack/react-query';
import { api, Ticket } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, Plus, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  confirmed: { label: 'Confirmé', className: 'bg-success/10 text-success border-success/20' },
  pending: { label: 'En attente', className: 'bg-warning/10 text-warning border-warning/20' },
  cancelled: { label: 'Annulé', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const Tickets = () => {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: api.getTickets,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Tickets</h1>
            <p className="text-muted-foreground mt-1">Gérez tous les tickets de transport</p>
          </div>
          <Button className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau ticket
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un ticket..." 
              className="pl-10 bg-card border-border"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Référence</TableHead>
                <TableHead className="font-semibold">Passager</TableHead>
                <TableHead className="font-semibold">Trajet</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Prix</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : (
                tickets?.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/30 cursor-pointer transition-colors">
                    <TableCell className="font-mono font-medium text-primary">{ticket.reference}</TableCell>
                    <TableCell className="font-medium">{ticket.passenger}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.departure} → {ticket.destination}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ticket.date}</TableCell>
                    <TableCell className="font-semibold">{ticket.price.toLocaleString()} F</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", statusConfig[ticket.status].className)}
                      >
                        {statusConfig[ticket.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tickets;
