import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, TrendingUp, Users, Ticket, Bus, Loader2, Package, Monitor, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateTripManifestPdf } from '@/lib/documentPdf';
import { toast } from '@/hooks/use-toast';

const reports = [
  {
    id: 1,
    title: 'Rapport par Agence',
    description: 'Performance des agences : voyages, tickets, recettes et carburant',
    icon: Building2,
    type: 'Agences',
    route: '/rapports/agence',
    badge: 'PDF & Excel',
  },
  {
    id: 2,
    title: 'Rapport par Ligne',
    description: "Taux d'occupation et revenus par ligne de transport",
    icon: TrendingUp,
    type: 'Lignes',
    route: '/rapports/lignes',
    badge: 'PDF & Excel',
  },
  {
    id: 3,
    title: 'Rapport des Caissiers',
    description: 'Performance des caissiers : sessions, ventes et écarts',
    icon: Users,
    type: 'Caissiers',
    route: '/rapports/caisse',
    badge: 'PDF & Excel',
  },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { 
    maximumFractionDigits: 0,
    useGrouping: true 
  }).format(value) + ' F CFA';
};

const getPaymentLabel = (method: string | null) => {
  switch (method) {
    case 'cash':
      return 'Espèces';
    case 'mobile_money':
      return 'Mobile Money';
    case 'card':
      return 'Carte';
    default:
      return 'Autre';
  }
};

const Rapports = () => {
  const navigate = useNavigate();
  const [manifestOpen, setManifestOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  // Fetch company settings
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url, address, phone, email, rccm, ifu')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch trips for manifest selection
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['trips-for-manifest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          route:routes(*, departure_agency:agencies!routes_departure_agency_id_fkey(*), arrival_agency:agencies!routes_arrival_agency_id_fkey(*)),
          vehicle:vehicles(*),
          driver:staff!trips_driver_id_fkey(full_name),
          assistant:staff!trips_assistant_id_fkey(full_name)
        `)
        .order('departure_datetime', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch tickets for selected trip
  const { data: manifestData, isLoading: manifestLoading } = useQuery({
    queryKey: ['trip-manifest', selectedTripId],
    queryFn: async () => {
      if (!selectedTripId) return null;
      
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('trip_id', parseInt(selectedTripId))
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const trip = trips.find(t => t.id === parseInt(selectedTripId));
      
      const byPayment = tickets?.reduce((acc, ticket) => {
        const method = ticket.payment_method || 'other';
        if (!acc[method]) {
          acc[method] = { count: 0, total: 0 };
        }
        acc[method].count++;
        acc[method].total += ticket.total_amount;
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      return {
        trip,
        tickets: tickets || [],
        totalPassengers: tickets?.filter(t => t.status === 'paid').length || 0,
        totalAmount: tickets?.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.total_amount, 0) || 0,
        byPayment: Object.entries(byPayment || {}).map(([method, data]) => ({
          method,
          count: data.count,
          total: data.total,
        })),
      };
    },
    enabled: !!selectedTripId && manifestOpen,
  });

  const selectedTrip = trips.find(t => t.id === parseInt(selectedTripId));

  const handleExportManifest = () => {
    if (!selectedTrip || !manifestData) return;
    
    const paidTickets = manifestData.tickets.filter(t => t.status === 'paid');
    
    generateTripManifestPdf(selectedTrip as any, paidTickets, {
      name: companySettings?.company_name || 'Transport Express',
      logoUrl: companySettings?.logo_url,
      address: companySettings?.address || '',
      phone: companySettings?.phone || '',
      email: companySettings?.email || '',
      rccm: companySettings?.rccm || '',
      ifu: companySettings?.ifu || '',
    });
    
    toast({ title: 'Manifeste exporté', description: 'Le PDF a été téléchargé.' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Rapports</h1>
          <p className="text-muted-foreground mt-1">Consultez et exportez vos rapports d'activité</p>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Manifest Report Card */}
          <Card 
            className="p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-slide-up border-primary/20"
            onClick={() => setManifestOpen(true)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg gradient-primary">
                <Bus className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                Nouveau
              </span>
            </div>
            
            <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">
              Manifeste de voyage
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Liste des passagers d'un voyage avec détails des tickets
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">En temps réel</span>
              <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
                Consulter
              </Button>
            </div>
          </Card>

          {/* Expeditions Report Card */}
          <Card 
            className="p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-slide-up border-primary/20"
            onClick={() => navigate('/rapports/expeditions')}
            style={{ animationDelay: '100ms' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg gradient-primary">
                <Package className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                Nouveau
              </span>
            </div>
            
            <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">
              Rapport Expéditions
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Récapitulatif des bagages et colis par période
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">Par période</span>
              <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
                Consulter
              </Button>
            </div>
          </Card>

          {/* Sessions Report Card */}
          <Card 
            className="p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-slide-up border-primary/20"
            onClick={() => navigate('/rapports/sessions')}
            style={{ animationDelay: '150ms' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg gradient-primary">
                <Monitor className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                Nouveau
              </span>
            </div>
            
            <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">
              Journal des Sessions
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Historique des sessions de guichet avec tickets vendus
            </p>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">Par période</span>
              <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
                Consulter
              </Button>
            </div>
          </Card>

          {reports.map((report, index) => (
            <Card 
              key={report.id}
              className="p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${(index + 3) * 100}ms` }}
              onClick={() => navigate(report.route)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg gradient-primary">
                  <report.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                  {report.badge}
                </span>
              </div>
              
              <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">
                {report.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {report.description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground">{report.type}</span>
                <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary">
                  Consulter
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty state for more reports */}
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">
            Plus de rapports à venir
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            D'autres rapports personnalisés seront bientôt disponibles.
          </p>
        </div>
      </div>

      {/* Manifest Dialog */}
      <Dialog open={manifestOpen} onOpenChange={setManifestOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Manifeste de voyage</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Trip Selection */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Sélectionner un voyage
                </label>
                <Select value={selectedTripId} onValueChange={setSelectedTripId}>
                  <SelectTrigger>
                    <SelectValue placeholder={tripsLoading ? "Chargement..." : "Choisir un voyage"} />
                  </SelectTrigger>
                  <SelectContent>
                    {trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id.toString()}>
                        {trip.route?.name || 'Sans itinéraire'} — {format(new Date(trip.departure_datetime), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Trip Info & Stats */}
            {selectedTrip && manifestData && (
              <>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Voyage <span className="font-semibold text-foreground">#{selectedTrip.id}</span> — {selectedTrip.route?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Départ : <span className="font-semibold">{format(new Date(selectedTrip.departure_datetime), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Véhicule : {selectedTrip.vehicle?.registration_number || 'N/A'} ({selectedTrip.vehicle?.seats || 0} places)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Passagers :</span>{' '}
                        <span className="font-semibold text-foreground">{manifestData.totalPassengers}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Total :</span>{' '}
                        <span className="font-semibold text-primary">{formatCurrency(manifestData.totalAmount)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Payment breakdown */}
                  {manifestData.byPayment.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                      {manifestData.byPayment.map((p) => (
                        <span
                          key={p.method}
                          className="text-xs bg-background px-2 py-1 rounded border border-border"
                        >
                          {getPaymentLabel(p.method)} : {p.count} tickets — {formatCurrency(p.total)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Passengers Table */}
                {manifestLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : manifestData.tickets.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Client</TableHead>
                          <TableHead className="text-xs">Référence</TableHead>
                          <TableHead className="text-xs">Paiement</TableHead>
                          <TableHead className="text-xs text-right">Montant</TableHead>
                          <TableHead className="text-xs">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manifestData.tickets.map((ticket, idx) => (
                          <TableRow key={ticket.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm font-medium">{idx + 1}</TableCell>
                            <TableCell className="text-sm">{ticket.customer_name || 'Anonyme'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{ticket.reference || '-'}</TableCell>
                            <TableCell className="text-sm">{getPaymentLabel(ticket.payment_method)}</TableCell>
                            <TableCell className="text-sm text-right font-medium">{formatCurrency(ticket.total_amount)}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                ticket.status === 'paid' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>
                                {ticket.status === 'paid' ? 'Payé' : 'En attente'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ticket className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun ticket pour ce voyage</p>
                  </div>
                )}
              </>
            )}

            {!selectedTripId && (
              <div className="text-center py-12 text-muted-foreground">
                <Bus className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sélectionnez un voyage pour voir son manifeste</p>
              </div>
            )}
          </div>

          {selectedTrip && manifestData && manifestData.tickets.length > 0 && (
            <DialogFooter>
              <Button onClick={handleExportManifest} className="gap-2">
                <Download className="w-4 h-4" />
                Exporter en PDF
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Rapports;
