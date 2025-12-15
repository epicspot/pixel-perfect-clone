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
import { Search, Plus, Filter, Ticket, TrendingUp, Bus, Printer, XCircle, RotateCcw, Eye, MoreHorizontal, Package, AlertTriangle, Monitor, Armchair } from 'lucide-react';
import { SeatSelector } from '@/components/tickets/SeatSelector';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [adminAgencyFilter, setAdminAgencyFilter] = React.useState('');

  const isAdmin = profile?.role === 'admin';
  const isCashier = profile?.role === 'cashier';
  const filterAgencyId = isAdmin 
    ? (adminAgencyFilter ? Number(adminAgencyFilter) : undefined)
    : profile?.agency_id || undefined;

  // Check if user has an active counter session
  const { data: activeSession } = useQuery({
    queryKey: ['active-session-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('counter_sessions')
        .select('id, counter:ticket_counters(name)')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', filterAgencyId],
    queryFn: () => api.getTickets({ agency_id: filterAgencyId }),
  });

  // Company settings for PDF generation
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url, address, phone, email, rccm, ifu')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
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

        {/* Session Warning Alert */}
        {!activeSession && !isAdmin && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">Aucune session de guichet ouverte</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Vous devez ouvrir une session de guichet avant de vendre des tickets. 
                Les ventes effectuées sans session ne seront pas comptabilisées dans le journal de caisse.
              </p>
              <a href="/guichets" className="inline-flex items-center gap-2 mt-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline">
                <Monitor className="w-4 h-4" />
                Ouvrir une session
              </a>
            </div>
          </div>
        )}

        {/* Active Session Info */}
        {activeSession && !isAdmin && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-center gap-3">
            <Monitor className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-800 dark:text-green-200">
              Session active : <span className="font-medium">{(activeSession.counter as any)?.name || 'Guichet'}</span>
            </p>
          </div>
        )}

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
                            <DropdownMenuItem onClick={async () => await generateTicketPdf(ticket, { name: companySettings?.company_name || 'Transport Express', logoUrl: companySettings?.logo_url, address: companySettings?.address, phone: companySettings?.phone, email: companySettings?.email, rccm: companySettings?.rccm, ifu: companySettings?.ifu })}>
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
  const { user } = useAuth();
  const [tripId, setTripId] = React.useState<string>('');
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [price, setPrice] = React.useState('');
  const [selectedSeats, setSelectedSeats] = React.useState<string[]>([]);
  const [isGroupMode, setIsGroupMode] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Excess baggage state
  const [hasExcessBaggage, setHasExcessBaggage] = React.useState(false);
  const [baggageWeight, setBaggageWeight] = React.useState('');
  const [baggageDescription, setBaggageDescription] = React.useState('');
  const [baggagePricePerKg, setBaggagePricePerKg] = React.useState('500');
  const [baggageBasePrice, setBaggageBasePrice] = React.useState('1000');

  // Fetch active counter session for current user
  const { data: activeSession } = useQuery({
    queryKey: ['active-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('counter_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch baggage pricing from database
  const { data: baggagePricing } = useQuery({
    queryKey: ['baggage-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_pricing')
        .select('*')
        .eq('type', 'excess_baggage')
        .single();
      if (error) return null;
      return data;
    },
  });

  // Company settings for PDF generation
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url, address, phone, email, rccm, ifu')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Initialize baggage pricing when data loads
  React.useEffect(() => {
    if (baggagePricing) {
      setBaggagePricePerKg(baggagePricing.price_per_kg.toString());
      setBaggageBasePrice(baggagePricing.base_price.toString());
    }
  }, [baggagePricing]);

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

  // Fetch occupied seats for selected trip
  const { data: occupiedSeats } = useQuery({
    queryKey: ['occupied-seats', tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('tickets')
        .select('seat_number')
        .eq('trip_id', Number(tripId))
        .in('status', ['paid', 'reserved'])
        .not('seat_number', 'is', null);
      
      if (error) throw error;
      return data?.map(t => t.seat_number) || [];
    },
    enabled: !!tripId,
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

  // Calculate baggage total
  const baggageTotal = hasExcessBaggage 
    ? (parseFloat(baggageWeight) || 0) * (parseFloat(baggagePricePerKg) || 0) + (parseFloat(baggageBasePrice) || 0)
    : 0;
  const totalWithBaggage = effectivePrice + baggageTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block sale if no active session
    if (!activeSession) {
      toast({ 
        title: 'Session requise', 
        description: 'Vous devez ouvrir une session de guichet avant de vendre des tickets.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!tripId || !customerName.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez remplir les champs obligatoires', variant: 'destructive' });
      return;
    }

    const seatsToSell = selectedSeats.length > 0 ? selectedSeats : [''];
    const ticketCount = seatsToSell.length;

    // Check capacity before sale
    if (selectedCapacity?.isFull) {
      toast({ title: 'Bus complet', description: 'Ce voyage est complet. Aucune place disponible.', variant: 'destructive' });
      return;
    }

    // Check if enough seats available for group booking
    if (ticketCount > (selectedCapacity?.remaining || 0)) {
      toast({ 
        title: 'Places insuffisantes', 
        description: `Vous avez sélectionné ${ticketCount} sièges mais il ne reste que ${selectedCapacity?.remaining} places.`, 
        variant: 'destructive' 
      });
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

      // Generate official ticket number: AGENCE-ANNEE-NUMERO
      const departureAgency = selectedTrip?.route?.departure_agency as any;
      const agencyCode = departureAgency?.code || departureAgency?.name?.substring(0, 3).toUpperCase() || 'TKT';
      const year = new Date().getFullYear();
      
      // Get the next sequential number for this agency/year
      const { count: existingTicketCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .like('reference', `${agencyCode}-${year}-%`);
      
      const createdTickets: any[] = [];
      
      // Create tickets for each seat
      for (let i = 0; i < seatsToSell.length; i++) {
        const seatNumber = seatsToSell[i];
        const sequentialNumber = ((existingTicketCount || 0) + i + 1).toString().padStart(6, '0');
        const reference = `${agencyCode}-${year}-${sequentialNumber}`;

        const departureAgencyId = (selectedTrip?.route?.departure_agency as any)?.id;
        
        const { data: newTicket, error } = await supabase.from('tickets').insert({
          trip_id: Number(tripId),
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          price: effectivePrice,
          total_amount: effectivePrice,
          payment_method: paymentMethod,
          seat_number: seatNumber || null,
          status: 'paid',
          sold_at: new Date().toISOString(),
          reference,
          session_id: activeSession?.id || null,
          agency_id: departureAgencyId,
        }).select().single();

        if (error) throw error;

        // Log audit for ticket sale
        if (newTicket) {
          audit.ticketSale(newTicket.id, reference, effectivePrice, newTicket.agency_id);
          createdTickets.push(newTicket);
        }
      }

      // Create excess baggage shipment if applicable (only for first ticket)
      if (hasExcessBaggage && createdTickets[0] && parseFloat(baggageWeight) > 0) {
        const departureAgencyId = (selectedTrip?.route?.departure_agency as any)?.id;
        const arrivalAgencyId = (selectedTrip?.route?.arrival_agency as any)?.id;
        const bagReference = `BAG-${agencyCode}-${year}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        
        await supabase.from('shipments').insert({
          reference: bagReference,
          type: 'excess_baggage',
          trip_id: Number(tripId),
          ticket_id: createdTickets[0].id,
          departure_agency_id: departureAgencyId,
          arrival_agency_id: arrivalAgencyId,
          sender_name: customerName.trim(),
          sender_phone: customerPhone.trim() || null,
          receiver_name: customerName.trim(),
          receiver_phone: customerPhone.trim() || null,
          description: baggageDescription || 'Bagage excédentaire',
          weight_kg: parseFloat(baggageWeight) || 0,
          quantity: 1,
          price_per_kg: parseFloat(baggagePricePerKg) || 0,
          base_price: parseFloat(baggageBasePrice) || 0,
          total_amount: baggageTotal,
          is_excess_baggage: true,
          status: 'pending',
        });
      }

      // Print all tickets
      for (const ticket of createdTickets) {
        const ticketForPrint = {
          ...ticket,
          trip: selectedTrip ? {
            route: selectedTrip.route,
            vehicle: selectedTrip.vehicle,
            departure_datetime: selectedTrip.departure_datetime,
          } : undefined,
        };
        await generateTicketPdf(ticketForPrint, { name: companySettings?.company_name || 'Transport Express', logoUrl: companySettings?.logo_url, address: companySettings?.address, phone: companySettings?.phone, email: companySettings?.email, rccm: companySettings?.rccm, ifu: companySettings?.ifu });
      }

      const totalAmount = effectivePrice * createdTickets.length;
      const message = createdTickets.length > 1
        ? `${createdTickets.length} tickets créés pour ${customerName} (Total: ${formatCurrency(totalAmount)})`
        : `Ticket ${createdTickets[0]?.reference} créé pour ${customerName}`;
      toast({ title: 'Vente réussie', description: message });
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
    setSelectedSeats([]);
    setIsGroupMode(false);
    setHasExcessBaggage(false);
    setBaggageWeight('');
    setBaggageDescription('');
    setBaggagePricePerKg('500');
    setBaggageBasePrice('1000');
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Nouvelle vente de ticket</DialogTitle>
        </DialogHeader>
        
        {/* Session warning inside dialog */}
        {!activeSession && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Session de guichet requise</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Vous devez ouvrir une session avant de pouvoir vendre des tickets.
              </p>
            </div>
          </div>
        )}

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
                        <span className="truncate">{trip.route?.name || 'Route inconnue'} - {new Date(trip.departure_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
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
              <p className="font-semibold text-card-foreground truncate">{selectedTrip.route?.name}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <p className="text-muted-foreground truncate">
                  Départ: {new Date(selectedTrip.departure_datetime).toLocaleString('fr-FR')}
                </p>
                <p className="text-muted-foreground truncate">
                  Véhicule: {selectedTrip.vehicle?.registration_number || 'Non assigné'}
                </p>
              </div>
              
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

          {/* Customer Info - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nom du client *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nom et prénom"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Téléphone</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ex: 70 28 72 21"
                className="mt-1"
              />
            </div>
          </div>

          {/* Visual Seat Selection */}
          {selectedTrip && selectedCapacity && (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Armchair className="w-4 h-4" />
                  Sélection des sièges
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox 
                      checked={isGroupMode}
                      onCheckedChange={(checked) => {
                        setIsGroupMode(checked as boolean);
                        if (!checked) setSelectedSeats(selectedSeats.slice(0, 1));
                      }}
                    />
                    <span className="text-muted-foreground">Mode groupe</span>
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {occupiedSeats?.length || 0} / {selectedCapacity.capacity} occupés
                  </span>
                </div>
              </div>
              <SeatSelector
                totalSeats={selectedCapacity.capacity}
                occupiedSeats={occupiedSeats || []}
                selectedSeats={selectedSeats}
                onSelectSeats={setSelectedSeats}
                multiSelect={isGroupMode}
              />
              {selectedSeats.length > 1 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Réservation de groupe: {selectedSeats.length} tickets
                  </p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                    Total: {formatCurrency(effectivePrice * selectedSeats.length)}
                  </p>
                </div>
              )}
            </div>
          )}

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

          {/* Payment Method - Responsive Grid */}
          <div>
            <Label className="text-xs">Moyen de paiement</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {(['cash', 'mobile_money', 'card', 'other'] as PaymentMethod[]).map((method) => {
                const config = paymentConfig[method];
                const isActive = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'px-3 py-2 rounded-lg border text-xs text-center sm:text-left transition-colors',
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

          {/* Excess Baggage Option */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox 
                id="excess-baggage" 
                checked={hasExcessBaggage}
                onCheckedChange={(checked) => setHasExcessBaggage(checked as boolean)}
              />
              <label 
                htmlFor="excess-baggage" 
                className="text-sm font-medium cursor-pointer flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Ajouter un bagage excédentaire
              </label>
            </div>
            
            {hasExcessBaggage && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Poids (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={baggageWeight}
                      onChange={(e) => setBaggageWeight(e.target.value)}
                      placeholder="Ex: 5"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Prix/kg (F)</Label>
                    <Input
                      type="number"
                      value={baggagePricePerKg}
                      onChange={(e) => setBaggagePricePerKg(e.target.value)}
                      placeholder="500"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Frais de base (F)</Label>
                    <Input
                      type="number"
                      value={baggageBasePrice}
                      onChange={(e) => setBaggageBasePrice(e.target.value)}
                      placeholder="1000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={baggageDescription}
                      onChange={(e) => setBaggageDescription(e.target.value)}
                      placeholder="Description du bagage"
                      className="mt-1"
                    />
                  </div>
                </div>
                {baggageTotal > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Sous-total bagage</span>
                    <span className="font-semibold text-sm">{formatCurrency(baggageTotal)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t border-border pt-3">
            {hasExcessBaggage && baggageTotal > 0 && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Ticket</span>
                <span>{formatCurrency(effectivePrice)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {hasExcessBaggage && baggageTotal > 0 ? 'Montant total (ticket + bagage)' : 'Montant total'}
              </span>
              <span className="text-xl font-bold text-card-foreground">{formatCurrency(totalWithBaggage)}</span>
            </div>
          </div>

          {/* Actions - Responsive */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:flex-1">
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !tripId || !customerName.trim()}
              className="w-full sm:flex-1 bg-primary text-primary-foreground"
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
