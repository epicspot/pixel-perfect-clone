import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Trip, Vehicle } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Search, Plus, Filter, Ticket, TrendingUp, Bus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AgencyFilter } from '@/components/filters/AgencyFilter';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const statusConfig = {
  paid: { label: 'Payé', className: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' },
  pending: { label: 'En attente', className: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800' },
  cancelled: { label: 'Annulé', className: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' },
};

const paymentConfig: Record<string, { label: string; className: string }> = {
  cash: { label: 'Espèces', className: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
  mobile_money: { label: 'Mobile Money', className: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' },
  card: { label: 'Carte', className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  other: { label: 'Autre', className: 'bg-muted text-muted-foreground' },
};

type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'other';

const Tickets = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [adminAgencyFilter, setAdminAgencyFilter] = React.useState('');

  const isAdmin = profile?.role === 'admin';
  const filterAgencyId = isAdmin 
    ? (adminAgencyFilter ? Number(adminAgencyFilter) : undefined)
    : profile?.agency_id || undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', filterAgencyId],
    queryFn: () => api.getTickets({ agency_id: filterAgencyId }),
  });

  const tickets = data?.data || [];
  const filteredTickets = tickets.filter(t => 
    t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const todayTickets = tickets.filter(t => {
    if (!t.sold_at) return false;
    const today = new Date().toISOString().split('T')[0];
    return t.sold_at.startsWith(today);
  });
  const todaySales = todayTickets.reduce((sum, t) => sum + (t.price || 0), 0);
  const paidCount = tickets.filter(t => t.status === 'paid').length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Vente de tickets</h1>
            <p className="text-muted-foreground text-sm mt-1">Gérez les ventes et les tickets de transport</p>
          </div>
          <NewTicketDialog 
            open={isDialogOpen} 
            onOpenChange={setIsDialogOpen}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ventes du jour</p>
              <p className="text-xl font-bold text-card-foreground">{formatCurrency(todaySales)}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tickets aujourd'hui</p>
              <p className="text-xl font-bold text-card-foreground">{todayTickets.length}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Bus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tickets payés (total)</p>
              <p className="text-xl font-bold text-card-foreground">{paidCount}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <AgencyFilter 
            value={adminAgencyFilter} 
            onChange={setAdminAgencyFilter}
            className="min-w-[180px]"
          />
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un ticket..." 
              className="pl-10 bg-card border-border"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-destructive text-sm">
            Erreur lors du chargement des tickets.
          </div>
        )}

        {/* Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-xs">Réf.</TableHead>
                <TableHead className="font-semibold text-xs">Client</TableHead>
                <TableHead className="font-semibold text-xs">Date</TableHead>
                <TableHead className="font-semibold text-xs">Paiement</TableHead>
                <TableHead className="font-semibold text-xs text-right">Montant</TableHead>
                <TableHead className="font-semibold text-xs text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : (
                filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.pending;
                  const payment = paymentConfig[ticket.payment_method || 'cash'] || paymentConfig.cash;
                  return (
                    <TableRow key={ticket.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-primary">
                        {ticket.reference || `#${ticket.id}`}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {ticket.customer_name || 'Anonyme'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {ticket.sold_at ? formatDate(ticket.sold_at) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', payment.className)}>
                          {payment.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-right">
                        {formatCurrency(ticket.price || ticket.total_amount || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn('text-[10px]', status.className)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {!isLoading && filteredTickets.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Aucun ticket trouvé
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// New Ticket Dialog Component
interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const NewTicketDialog: React.FC<NewTicketDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [tripId, setTripId] = React.useState<string>('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [price, setPrice] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: tripsData } = useQuery({
    queryKey: ['trips'],
    queryFn: () => api.getTrips(),
  });

  const trips = tripsData?.data || [];
  const selectedTrip = trips.find(t => t.id.toString() === tripId);
  const basePrice = selectedTrip?.route?.base_price || 0;
  const effectivePrice = price ? Number(price) : basePrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !customerName.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez remplir les champs obligatoires', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const reference = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('tickets').insert({
        trip_id: Number(tripId),
        customer_name: customerName.trim(),
        price: effectivePrice,
        total_amount: effectivePrice,
        payment_method: paymentMethod,
        status: 'paid',
        sold_at: new Date().toISOString(),
        reference,
      });

      if (error) throw error;

      toast({ title: 'Ticket vendu', description: `Ticket ${reference} créé pour ${customerName}` });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTripId('');
    setCustomerName('');
    setCustomerPhone('');
    setPaymentMethod('cash');
    setPrice('');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Vendre un ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle vente de ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trip Selection */}
          <div>
            <Label className="text-xs">Voyage *</Label>
            <Select value={tripId} onValueChange={setTripId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un voyage" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id.toString()}>
                    {trip.route?.name || 'Route inconnue'} - {new Date(trip.departure_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trip Info */}
          {selectedTrip && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <p className="font-semibold text-card-foreground">{selectedTrip.route?.name}</p>
              <p className="text-muted-foreground mt-1">
                Départ: {new Date(selectedTrip.departure_datetime).toLocaleString('fr-FR')}
              </p>
              <p className="text-muted-foreground">
                Véhicule: {selectedTrip.vehicle?.registration_number || 'Non assigné'}
              </p>
              <p className="text-muted-foreground">
                Prix de base: <span className="font-semibold text-card-foreground">{formatCurrency(basePrice)}</span>
              </p>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Nom du client *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nom et prénom"
                className="mt-1"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Téléphone</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ex: 70 28 72 21"
                className="mt-1"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <Label className="text-xs">Prix (F CFA)</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={basePrice.toString()}
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Vide = prix de base ({formatCurrency(basePrice)})
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-xs">Moyen de paiement</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(['cash', 'mobile_money', 'card', 'other'] as PaymentMethod[]).map((method) => {
                const config = paymentConfig[method];
                const isActive = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-xs text-left transition-colors',
                      isActive
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card border-border text-card-foreground hover:bg-muted'
                    )}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Montant total</span>
              <span className="text-xl font-bold text-card-foreground">{formatCurrency(effectivePrice)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !tripId || !customerName.trim()}
              className="flex-1 bg-primary text-primary-foreground"
            >
              {isSubmitting ? 'Enregistrement...' : 'Vendre le ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Tickets;
