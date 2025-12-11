import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Trip, Vehicle } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Search, Plus, Filter, Ticket, TrendingUp, Bus, Printer, XCircle, RotateCcw, Eye, MoreHorizontal } from 'lucide-react';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AgencyFilter } from '@/components/filters/AgencyFilter';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateTicketPdf } from '@/lib/documentPdf';
import { audit } from '@/lib/audit';

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: 'Payé', className: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800' },
  pending: { label: 'En attente', className: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800' },
  cancelled: { label: 'Annulé', className: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800' },
  refunded: { label: 'Remboursé', className: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800' },
  used: { label: 'Utilisé', className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' },
  reserved: { label: 'Réservé', className: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800' },
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
                <TableHead className="font-semibold text-xs text-center w-[60px]">Actions</TableHead>
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
                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
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
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={async () => await generateTicketPdf(ticket)}>
                              <Printer className="w-4 h-4 mr-2" />
                              Imprimer
                            </DropdownMenuItem>
                            <TicketDetailsMenuItem ticket={ticket} />
                            <DropdownMenuSeparator />
                            {ticket.status === 'paid' && (
                              <>
                                <CancelTicketMenuItem ticket={ticket} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })} />
                                <RefundTicketMenuItem ticket={ticket} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })} />
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

  // Fetch ticket counts for all trips
  const { data: ticketCounts } = useQuery({
    queryKey: ['trip-ticket-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('trip_id')
        .in('status', ['paid', 'reserved']);
      
      if (error) throw error;
      
      // Count tickets per trip
      const counts: Record<number, number> = {};
      data?.forEach(ticket => {
        if (ticket.trip_id) {
          counts[ticket.trip_id] = (counts[ticket.trip_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Filter trips available for sale (only planned, scheduled, or boarding)
  const allTrips = tripsData?.data || [];
  const trips = allTrips.filter(t => {
    const status = t.status as string;
    return status === 'planned' || status === 'scheduled' || status === 'boarding';
  });

  // Helper to get trip capacity info
  const getTripCapacity = (trip: any) => {
    const capacity = trip.vehicle?.seats || 50;
    const soldCount = ticketCounts?.[trip.id] || 0;
    const remaining = capacity - soldCount;
    return { capacity, soldCount, remaining, isFull: remaining <= 0 };
  };

  const selectedTrip = trips.find(t => t.id.toString() === tripId);
  const selectedCapacity = selectedTrip ? getTripCapacity(selectedTrip) : null;
  const basePrice = selectedTrip?.route?.base_price || 0;
  const effectivePrice = price ? Number(price) : basePrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !customerName.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez remplir les champs obligatoires', variant: 'destructive' });
      return;
    }

    // Check capacity before sale
    if (selectedCapacity?.isFull) {
      toast({ title: 'Bus complet', description: 'Ce voyage est complet. Aucune place disponible.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Double-check capacity with fresh data
      const { count, error: countError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', Number(tripId))
        .in('status', ['paid', 'reserved']);
      
      if (countError) throw countError;
      
      const capacity = selectedTrip?.vehicle?.seats || 50;
      if ((count || 0) >= capacity) {
        toast({ title: 'Bus complet', description: 'Ce voyage vient de se remplir. Veuillez choisir un autre voyage.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const reference = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const { data: newTicket, error } = await supabase.from('tickets').insert({
        trip_id: Number(tripId),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        price: effectivePrice,
        total_amount: effectivePrice,
        payment_method: paymentMethod,
        status: 'paid',
        sold_at: new Date().toISOString(),
        reference,
      }).select().single();

      if (error) throw error;

      // Log audit for ticket sale
      if (newTicket) {
        audit.ticketSale(newTicket.id, reference, effectivePrice, newTicket.agency_id);
      }

      // Impression automatique du ticket
      const ticketForPrint = {
        ...newTicket,
        trip: selectedTrip ? {
          route: selectedTrip.route,
          vehicle: selectedTrip.vehicle,
          departure_datetime: selectedTrip.departure_datetime,
        } : undefined,
      };
      await generateTicketPdf(ticketForPrint);

      toast({ title: 'Ticket vendu', description: `Ticket ${reference} créé et imprimé pour ${customerName}` });
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
                {trips.map((trip) => {
                  const { remaining, isFull, capacity, soldCount } = getTripCapacity(trip);
                  return (
                    <SelectItem 
                      key={trip.id} 
                      value={trip.id.toString()}
                      disabled={isFull}
                      className={cn(isFull && 'opacity-50')}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{trip.route?.name || 'Route inconnue'} - {new Date(trip.departure_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          isFull 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                            : remaining <= 5 
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        )}>
                          {isFull ? 'COMPLET' : `${remaining} places`}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Trip Info */}
          {selectedTrip && selectedCapacity && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2">
              <p className="font-semibold text-card-foreground">{selectedTrip.route?.name}</p>
              <p className="text-muted-foreground">
                Départ: {new Date(selectedTrip.departure_datetime).toLocaleString('fr-FR')}
              </p>
              <p className="text-muted-foreground">
                Véhicule: {selectedTrip.vehicle?.registration_number || 'Non assigné'}
              </p>
              
              {/* Capacity indicator */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Places</span>
                  <span className={cn(
                    'font-semibold',
                    selectedCapacity.remaining <= 5 ? 'text-orange-600' : 'text-green-600'
                  )}>
                    {selectedCapacity.remaining} / {selectedCapacity.capacity} disponibles
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all',
                      selectedCapacity.remaining <= 5 ? 'bg-orange-500' : 'bg-green-500'
                    )}
                    style={{ width: `${(selectedCapacity.soldCount / selectedCapacity.capacity) * 100}%` }}
                  />
                </div>
              </div>
              
              <p className="text-muted-foreground pt-1">
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

// Cancel Ticket Menu Item
const CancelTicketMenuItem: React.FC<{ ticket: any; onSuccess: () => void }> = ({ ticket, onSuccess }) => {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { user } = useAuth();

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez indiquer la raison de l\'annulation', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tickets').update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id,
        refund_reason: reason.trim(),
      }).eq('id', ticket.id);

      if (error) throw error;

      audit.ticketCancel(ticket.id, ticket.reference, reason.trim(), ticket.agency_id);

      toast({ title: 'Ticket annulé', description: `Le ticket ${ticket.reference} a été annulé` });
      setOpen(false);
      setReason('');
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
        <XCircle className="w-4 h-4 mr-2 text-destructive" />
        <span className="text-destructive">Annuler</span>
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler le ticket</DialogTitle>
            <DialogDescription>
              Ticket {ticket.reference} - {ticket.customer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              Cette action est irréversible. Le ticket sera marqué comme annulé.
            </div>
            <div>
              <Label className="text-xs">Raison de l'annulation *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Indiquez la raison de l'annulation..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Fermer
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancel} 
                disabled={isSubmitting || !reason.trim()}
                className="flex-1"
              >
                {isSubmitting ? 'Annulation...' : 'Confirmer l\'annulation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Refund Ticket Menu Item
const RefundTicketMenuItem: React.FC<{ ticket: any; onSuccess: () => void }> = ({ ticket, onSuccess }) => {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [refundAmount, setRefundAmount] = React.useState(ticket.price?.toString() || '0');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { user } = useAuth();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  const handleRefund = async () => {
    if (!reason.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez indiquer la raison du remboursement', variant: 'destructive' });
      return;
    }

    const amount = Number(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Erreur', description: 'Montant de remboursement invalide', variant: 'destructive' });
      return;
    }

    if (amount > (ticket.price || 0)) {
      toast({ title: 'Erreur', description: 'Le montant ne peut pas dépasser le prix du ticket', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tickets').update({
        status: 'refunded',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user?.id,
        refund_reason: reason.trim(),
        refund_amount: amount,
      }).eq('id', ticket.id);

      if (error) throw error;

      audit.ticketRefund(ticket.id, ticket.reference, amount, ticket.agency_id);

      toast({ title: 'Ticket remboursé', description: `${formatCurrency(amount)} remboursé pour le ticket ${ticket.reference}` });
      setOpen(false);
      setReason('');
      onSuccess();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
        <RotateCcw className="w-4 h-4 mr-2 text-purple-600" />
        <span className="text-purple-600">Rembourser</span>
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rembourser le ticket</DialogTitle>
            <DialogDescription>
              Ticket {ticket.reference} - {ticket.customer_name} ({formatCurrency(ticket.price || 0)})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Montant à rembourser (F CFA) *</Label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="mt-1"
                max={ticket.price}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Maximum: {formatCurrency(ticket.price || 0)}
              </p>
            </div>
            <div>
              <Label className="text-xs">Raison du remboursement *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Indiquez la raison du remboursement..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Fermer
              </Button>
              <Button 
                onClick={handleRefund} 
                disabled={isSubmitting || !reason.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? 'Remboursement...' : `Rembourser ${formatCurrency(Number(refundAmount) || 0)}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Ticket Details Menu Item
const TicketDetailsMenuItem: React.FC<{ ticket: any }> = ({ ticket }) => {
  const [open, setOpen] = React.useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
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

  const status = statusConfig[ticket.status] || statusConfig.pending;
  const payment = paymentConfig[ticket.payment_method || 'cash'] || paymentConfig.cash;

  return (
    <>
      <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
        <Eye className="w-4 h-4 mr-2" />
        Détails
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails du ticket</DialogTitle>
            <DialogDescription>
              {ticket.reference}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-sm px-3 py-1', status.className)}>
                {status.label}
              </Badge>
              <Badge variant="outline" className={cn('text-sm px-3 py-1', payment.className)}>
                {payment.label}
              </Badge>
            </div>

            {/* Client Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Informations client</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Nom</span>
                  <p className="font-medium">{ticket.customer_name || 'Anonyme'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Téléphone</span>
                  <p className="font-medium">{ticket.customer_phone || '—'}</p>
                </div>
              </div>
            </div>

            {/* Transaction Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">Transaction</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Montant</span>
                  <p className="font-bold text-lg">{formatCurrency(ticket.price || ticket.total_amount || 0)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Date de vente</span>
                  <p className="font-medium">{formatDate(ticket.sold_at)}</p>
                </div>
                {ticket.seat_number && (
                  <div>
                    <span className="text-muted-foreground text-xs">Siège</span>
                    <p className="font-medium">{ticket.seat_number}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cancellation/Refund History */}
            {(ticket.status === 'cancelled' || ticket.status === 'refunded') && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm text-destructive">
                  {ticket.status === 'refunded' ? 'Remboursement' : 'Annulation'}
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Date</span>
                    <p className="font-medium">{formatDate(ticket.cancelled_at)}</p>
                  </div>
                  {ticket.refund_amount && (
                    <div>
                      <span className="text-muted-foreground text-xs">Montant remboursé</span>
                      <p className="font-bold text-purple-600">{formatCurrency(ticket.refund_amount)}</p>
                    </div>
                  )}
                  {ticket.refund_reason && (
                    <div>
                      <span className="text-muted-foreground text-xs">Raison</span>
                      <p className="font-medium bg-background/50 rounded p-2 mt-1">{ticket.refund_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Tickets;
