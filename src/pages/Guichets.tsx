import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Monitor, 
  Plus, 
  Play, 
  Square, 
  Clock, 
  Banknote,
  AlertCircle,
  CheckCircle2,
  History,
  Building2,
  User,
  TrendingUp,
  TrendingDown,
  Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AgencyFilter, useAgencyFilter } from '@/components/filters/AgencyFilter';
import { setGlobalLoading } from '@/hooks/useLoadingProgress';
import { formatCurrency } from '@/lib/formatters';

export default function Guichets() {
  const { user, profile } = useAuth();
  const { canView, canCreate, canEdit, canDelete } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('all');
  const [isCreateCounterOpen, setIsCreateCounterOpen] = useState(false);
  const [isOpenSessionOpen, setIsOpenSessionOpen] = useState(false);
  const [isCloseSessionOpen, setIsCloseSessionOpen] = useState(false);
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterAgencyId, setNewCounterAgencyId] = useState<string>('');
  const [selectedCounterId, setSelectedCounterId] = useState<number | null>(null);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const canViewGuichets = canView('guichets');
  const canCreateGuichets = canCreate('guichets');
  const canEditGuichets = canEdit('guichets');
  const filterAgencyId = isAdmin 
    ? (selectedAgencyId !== 'all' ? parseInt(selectedAgencyId) : null)
    : profile?.agency_id;

  // Fetch agencies
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch ticket counters
  const { data: counters = [] } = useQuery({
    queryKey: ['ticket-counters', filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('ticket_counters')
        .select(`
          *,
          agency:agencies(id, name, code)
        `)
        .order('name');
      
      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch active session for current user
  const { data: activeSession } = useQuery({
    queryKey: ['active-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('counter_sessions')
        .select(`
          *,
          counter:ticket_counters(id, name, agency:agencies(id, name, code))
        `)
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch session history
  const { data: sessionHistory = [] } = useQuery({
    queryKey: ['session-history', filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('counter_sessions')
        .select(`
          *,
          counter:ticket_counters(id, name)
        `)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(50);

      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch user names separately
      const userIds = [...new Set(data?.map(s => s.user_id).filter(Boolean) || [])];
      let userMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        userMap = Object.fromEntries(profiles?.map(p => [p.id, p.name]) || []);
      }
      
      return data?.map(s => ({
        ...s,
        userName: s.user_id ? userMap[s.user_id] || 'Inconnu' : 'Inconnu'
      })) || [];
    },
  });

  // Calculate expected cash from tickets sold during session
  const { data: sessionTickets } = useQuery({
    queryKey: ['session-tickets', activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return { total: 0, count: 0 };
      
      const { data, error } = await supabase
        .from('tickets')
        .select('total_amount, payment_method')
        .eq('seller_id', user?.id)
        .gte('sold_at', activeSession.opened_at)
        .eq('status', 'paid');

      if (error) throw error;

      const cashTickets = data?.filter(t => t.payment_method === 'cash') || [];
      const total = cashTickets.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
      
      return { total, count: data?.length || 0 };
    },
    enabled: !!activeSession,
  });

  // Create counter mutation
  const createCounterMutation = useMutation({
    mutationFn: async () => {
      // For admin, use selected agency from dialog; for manager, use their agency
      const agencyId = isAdmin 
        ? (newCounterAgencyId ? parseInt(newCounterAgencyId) : null)
        : profile?.agency_id;
      
      if (!agencyId) throw new Error('Veuillez sélectionner une agence');
      if (!newCounterName.trim()) throw new Error('Veuillez saisir un nom de guichet');

      const { error } = await supabase
        .from('ticket_counters')
        .insert({
          name: newCounterName.trim(),
          agency_id: agencyId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Guichet créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['ticket-counters'] });
      setIsCreateCounterOpen(false);
      setNewCounterName('');
      setNewCounterAgencyId('');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Open session mutation
  const openSessionMutation = useMutation({
    mutationFn: async () => {
      setGlobalLoading(true);
      if (!selectedCounterId || !user?.id) throw new Error('Données manquantes');

      const counter = counters.find(c => c.id === selectedCounterId);
      if (!counter) throw new Error('Guichet non trouvé');

      const { error } = await supabase
        .from('counter_sessions')
        .insert({
          counter_id: selectedCounterId,
          user_id: user.id,
          agency_id: counter.agency_id,
          opening_cash: parseFloat(openingCash) || 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setGlobalLoading(false);
      toast.success('Session ouverte avec succès');
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['session-history'] });
      setIsOpenSessionOpen(false);
      setOpeningCash('');
      setSelectedCounterId(null);
    },
    onError: (error: Error) => {
      setGlobalLoading(false);
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Fetch discrepancy threshold from settings
  const { data: thresholdSetting } = useQuery({
    queryKey: ['cash-discrepancy-threshold'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'cash_discrepancy_threshold')
        .maybeSingle();
      if (error) throw error;
      return data?.value ? parseFloat(data.value) : 5000;
    },
  });

  const discrepancyThreshold = thresholdSetting ?? 5000;

  // Close session mutation
  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      setGlobalLoading(true);
      if (!activeSession) throw new Error('Aucune session active');

      const closingCashNum = parseFloat(closingCash) || 0;
      const expectedCash = (activeSession.opening_cash || 0) + (sessionTickets?.total || 0);
      const difference = closingCashNum - expectedCash;

      // Update session
      const { error } = await supabase
        .from('counter_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closing_cash_declared: closingCashNum,
          closing_cash_expected: expectedCash,
          difference,
          closing_notes: closingNotes || null,
        })
        .eq('id', activeSession.id);
      if (error) throw error;

      // Create alert if discrepancy exceeds threshold
      if (Math.abs(difference) >= discrepancyThreshold) {
        const { error: alertError } = await supabase
          .from('cash_discrepancy_alerts')
          .insert({
            session_id: activeSession.id,
            user_id: user?.id,
            agency_id: activeSession.agency_id,
            difference,
            threshold: discrepancyThreshold,
          });
        if (alertError) console.error('Failed to create discrepancy alert:', alertError);
      }
    },
    onSuccess: () => {
      setGlobalLoading(false);
      toast.success('Session fermée avec succès');
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['session-history'] });
      setIsCloseSessionOpen(false);
      setClosingCash('');
      setClosingNotes('');
    },
    onError: (error: Error) => {
      setGlobalLoading(false);
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const expectedClosingCash = (activeSession?.opening_cash || 0) + (sessionTickets?.total || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Gestion des Guichets</h1>
          <p className="text-muted-foreground">Gérez les guichets et leurs sessions d'ouverture/fermeture</p>
        </div>

        {/* Read-only Alert */}
        {!canCreateGuichets && !canEditGuichets && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              Accès en lecture seule. Vous pouvez consulter les guichets mais pas les modifier.
            </AlertDescription>
          </Alert>
        )}

        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {isAdmin && (
            <AgencyFilter
              value={selectedAgencyId === 'all' ? '' : selectedAgencyId}
              onChange={(val) => setSelectedAgencyId(val || 'all')}
            />
          )}
          <div className="flex gap-2">
            {isAdmin && canCreateGuichets && (
              <Dialog open={isCreateCounterOpen} onOpenChange={setIsCreateCounterOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau guichet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un guichet</DialogTitle>
                    <DialogDescription>
                      Ajoutez un nouveau poste de vente à une agence
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Agence</Label>
                      <Select value={newCounterAgencyId} onValueChange={setNewCounterAgencyId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une agence" />
                        </SelectTrigger>
                        <SelectContent>
                          {agencies
                            .filter(a => a.name !== 'Siège') // Exclude Siège from counter creation
                            .map((agency) => (
                              <SelectItem key={agency.id} value={agency.id.toString()}>
                                {agency.name} {agency.code ? `(${agency.code})` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Les guichets sont créés depuis le Siège pour les agences opérationnelles
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="counterName">Nom du guichet</Label>
                      <Input
                        id="counterName"
                        placeholder="Ex: Guichet 1"
                        value={newCounterName}
                        onChange={(e) => setNewCounterName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateCounterOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => createCounterMutation.mutate()}
                      disabled={!newCounterName.trim() || !newCounterAgencyId || createCounterMutation.isPending}
                    >
                      Créer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Active Session Card */}
        {activeSession ? (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Session Active</CardTitle>
                    <CardDescription>
                      {activeSession.counter?.name} - {activeSession.counter?.agency?.name}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500">
                  <Play className="w-3 h-3 mr-1" />
                  En cours
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Ouverture</p>
                  <p className="font-semibold">
                    {format(new Date(activeSession.opened_at), 'HH:mm', { locale: fr })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activeSession.opened_at), { locale: fr, addSuffix: true })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Fond de caisse</p>
                  <p className="font-semibold">{formatCurrency(activeSession.opening_cash || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Ventes espèces</p>
                  <p className="font-semibold text-green-600">{formatCurrency(sessionTickets?.total || 0)}</p>
                  <p className="text-xs text-muted-foreground">{sessionTickets?.count || 0} tickets</p>
                </div>
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground">Caisse attendue</p>
                  <p className="font-semibold text-primary">{formatCurrency(expectedClosingCash)}</p>
                </div>
              </div>
              <Dialog open={isCloseSessionOpen} onOpenChange={setIsCloseSessionOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Square className="w-4 h-4 mr-2" />
                    Fermer la session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Fermer la session</DialogTitle>
                    <DialogDescription>
                      Déclarez le montant en caisse pour clôturer votre session
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Fond de caisse</span>
                        <span className="font-medium">{formatCurrency(activeSession.opening_cash || 0)}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Ventes espèces</span>
                        <span className="font-medium text-green-600">+ {formatCurrency(sessionTickets?.total || 0)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-medium">Caisse attendue</span>
                        <span className="font-bold text-primary">{formatCurrency(expectedClosingCash)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closingCash">Montant déclaré en caisse</Label>
                      <Input
                        id="closingCash"
                        type="number"
                        placeholder="0"
                        value={closingCash}
                        onChange={(e) => setClosingCash(e.target.value)}
                      />
                      {closingCash && (
                        <div className={`flex items-center gap-2 p-2 rounded ${
                          parseFloat(closingCash) === expectedClosingCash 
                            ? 'bg-green-100 text-green-700' 
                            : parseFloat(closingCash) > expectedClosingCash
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {parseFloat(closingCash) === expectedClosingCash ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-sm">Caisse conforme</span>
                            </>
                          ) : parseFloat(closingCash) > expectedClosingCash ? (
                            <>
                              <TrendingUp className="w-4 h-4" />
                              <span className="text-sm">
                                Excédent: +{formatCurrency(parseFloat(closingCash) - expectedClosingCash)}
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4" />
                              <span className="text-sm">
                                Manquant: {formatCurrency(parseFloat(closingCash) - expectedClosingCash)}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closingNotes">Notes (optionnel)</Label>
                      <Textarea
                        id="closingNotes"
                        placeholder="Remarques sur la session..."
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCloseSessionOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => closeSessionMutation.mutate()}
                      disabled={!closingCash || closeSessionMutation.isPending}
                      isLoading={closeSessionMutation.isPending}
                    >
                      Confirmer la fermeture
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Monitor className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Aucune session active</p>
              <p className="text-sm text-muted-foreground mb-4">
                Ouvrez une session pour commencer à vendre des tickets
              </p>
              <Dialog open={isOpenSessionOpen} onOpenChange={setIsOpenSessionOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Play className="w-4 h-4 mr-2" />
                    Ouvrir une session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ouvrir une session</DialogTitle>
                    <DialogDescription>
                      Sélectionnez un guichet et déclarez votre fond de caisse
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Guichet</Label>
                      <Select 
                        value={selectedCounterId?.toString() || ''} 
                        onValueChange={(v) => setSelectedCounterId(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un guichet" />
                        </SelectTrigger>
                        <SelectContent>
                          {counters
                            .filter(c => c.is_active)
                            .map((counter) => (
                              <SelectItem key={counter.id} value={counter.id.toString()}>
                                {counter.name} - {counter.agency?.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="openingCash">Fond de caisse initial</Label>
                      <Input
                        id="openingCash"
                        type="number"
                        placeholder="0"
                        value={openingCash}
                        onChange={(e) => setOpeningCash(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Montant en espèces au démarrage de votre session
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpenSessionOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => openSessionMutation.mutate()}
                      disabled={!selectedCounterId || openSessionMutation.isPending}
                    >
                      Ouvrir la session
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Counters and History */}
        <Tabs defaultValue="counters" className="space-y-4">
          <TabsList>
            <TabsTrigger value="counters" className="gap-2">
              <Monitor className="w-4 h-4" />
              Guichets
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Historique sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="counters">
            <Card>
              <CardHeader>
                <CardTitle>Liste des guichets</CardTitle>
                <CardDescription>
                  {counters.length} guichet(s) configuré(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {counters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun guichet configuré
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {counters.map((counter) => (
                      <Card key={counter.id} className="relative">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                counter.is_active ? 'bg-primary/10' : 'bg-muted'
                              }`}>
                                <Monitor className={`w-5 h-5 ${
                                  counter.is_active ? 'text-primary' : 'text-muted-foreground'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium">{counter.name}</p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="w-3 h-3" />
                                  {counter.agency?.name}
                                </div>
                              </div>
                            </div>
                            <Badge variant={counter.is_active ? 'default' : 'secondary'}>
                              {counter.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique des sessions</CardTitle>
                <CardDescription>
                  Dernières sessions fermées
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune session dans l'historique
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Guichet</TableHead>
                        <TableHead>Caissier</TableHead>
                        <TableHead>Durée</TableHead>
                        <TableHead className="text-right">Fond initial</TableHead>
                        <TableHead className="text-right">Attendu</TableHead>
                        <TableHead className="text-right">Déclaré</TableHead>
                        <TableHead className="text-right">Écart</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionHistory.map((session) => {
                        const difference = session.difference || 0;
                        return (
                          <TableRow key={session.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {format(new Date(session.opened_at), 'dd/MM/yyyy', { locale: fr })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(session.opened_at), 'HH:mm', { locale: fr })} - {' '}
                                  {session.closed_at && format(new Date(session.closed_at), 'HH:mm', { locale: fr })}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{session.counter?.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                {session.userName}
                              </div>
                            </TableCell>
                            <TableCell>
                              {session.closed_at && (
                                <span className="text-muted-foreground">
                                  {formatDistanceToNow(new Date(session.opened_at), { 
                                    locale: fr,
                                    includeSeconds: false 
                                  }).replace('environ ', '')}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(session.opening_cash || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(session.closing_cash_expected || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(session.closing_cash_declared || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={
                                difference === 0 ? 'default' : difference > 0 ? 'secondary' : 'destructive'
                              }>
                                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
