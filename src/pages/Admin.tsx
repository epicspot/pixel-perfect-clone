import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building2, Route, Bus, Users, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel, getRoleColorClasses, UserRole } from '@/lib/permissions';
import { audit } from '@/lib/audit';

type Tab = 'agencies' | 'routes' | 'vehicles' | 'users';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState<Tab>('agencies');
  const { profile } = useAuth();

  if (profile?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-1">Configuration des agences, lignes, véhicules et utilisateurs</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <TabButton icon={Building2} label="Agences" active={activeTab === 'agencies'} onClick={() => setActiveTab('agencies')} />
          <TabButton icon={Route} label="Lignes" active={activeTab === 'routes'} onClick={() => setActiveTab('routes')} />
          <TabButton icon={Bus} label="Véhicules" active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} />
          <TabButton icon={Users} label="Utilisateurs" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
        </div>

        {activeTab === 'agencies' && <AgenciesTab />}
        {activeTab === 'routes' && <RoutesTab />}
        {activeTab === 'vehicles' && <VehiclesTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </DashboardLayout>
  );
};

const TabButton = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) => (
  <Button variant={active ? 'default' : 'outline'} size="sm" onClick={onClick} className="gap-2">
    <Icon className="w-4 h-4" />
    {label}
  </Button>
);

/* ---------- AGENCIES TAB ---------- */
const AgenciesTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', city: '', address: '', phone: '' });

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agencies').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from('agencies').update(form).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agencies').insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      setDialogOpen(false);
      resetForm();
      toast.success(editing ? 'Agence modifiée' : 'Agence créée');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('agencies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success('Agence supprimée');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', city: '', address: '', phone: '' });
  };

  const openEdit = (agency: any) => {
    setEditing(agency);
    setForm({ name: agency.name, city: agency.city || '', address: agency.address || '', phone: agency.phone || '' });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Agences ({agencies.length})</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.city || '-'}</TableCell>
                  <TableCell>{a.address || '-'}</TableCell>
                  <TableCell>{a.phone || '-'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (window.confirm(`Supprimer "${a.name}" ?`)) deleteMutation.mutate(a.id); }}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {agencies.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucune agence</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Modifier l\'agence' : 'Nouvelle agence'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- ROUTES TAB ---------- */
const RoutesTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', base_price: '', departure_agency_id: '', arrival_agency_id: '' });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agencies').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*, departure_agency:agencies!routes_departure_agency_id_fkey(*), arrival_agency:agencies!routes_arrival_agency_id_fkey(*)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        base_price: parseFloat(form.base_price) || 0,
        departure_agency_id: parseInt(form.departure_agency_id) || null,
        arrival_agency_id: parseInt(form.arrival_agency_id) || null,
      };
      if (editing) {
        const { error } = await supabase.from('routes').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('routes').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ name: '', base_price: '', departure_agency_id: '', arrival_agency_id: '' });
      toast.success(editing ? 'Ligne modifiée' : 'Ligne créée');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('routes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Ligne supprimée');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const openEdit = (route: any) => {
    setEditing(route);
    setForm({
      name: route.name,
      base_price: route.base_price.toString(),
      departure_agency_id: route.departure_agency_id?.toString() || '',
      arrival_agency_id: route.arrival_agency_id?.toString() || '',
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Lignes ({routes.length})</h2>
        <Button onClick={() => { setEditing(null); setForm({ name: '', base_price: '', departure_agency_id: '', arrival_agency_id: '' }); setDialogOpen(true); }} className="gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead className="text-right">Prix de base</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.departure_agency?.name || '-'}</TableCell>
                  <TableCell>{r.arrival_agency?.name || '-'}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.base_price)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (window.confirm(`Supprimer "${r.name}" ?`)) deleteMutation.mutate(r.id); }}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {routes.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucune ligne</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Modifier la ligne' : 'Nouvelle ligne'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ouaga → Bobo" /></div>
            <div className="grid gap-2">
              <Label>Agence départ</Label>
              <Select value={form.departure_agency_id} onValueChange={(v) => setForm({ ...form, departure_agency_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{agencies.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Agence arrivée</Label>
              <Select value={form.arrival_agency_id} onValueChange={(v) => setForm({ ...form, arrival_agency_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{agencies.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Prix de base (F)</Label><Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- VEHICLES TAB ---------- */
const VehiclesTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ registration_number: '', agency_id: '', brand: '', model: '', seats: '50', status: 'active' });

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agencies').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vehicles').select('*, agency:agencies(*)').order('registration_number');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        registration_number: form.registration_number,
        agency_id: parseInt(form.agency_id) || null,
        brand: form.brand || null,
        model: form.model || null,
        seats: parseInt(form.seats) || 50,
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from('vehicles').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDialogOpen(false);
      setEditing(null);
      setForm({ registration_number: '', agency_id: '', brand: '', model: '', seats: '50', status: 'active' });
      toast.success(editing ? 'Véhicule modifié' : 'Véhicule créé');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Véhicule supprimé');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const openEdit = (vehicle: any) => {
    setEditing(vehicle);
    setForm({
      registration_number: vehicle.registration_number,
      agency_id: vehicle.agency_id?.toString() || '',
      brand: vehicle.brand || '',
      model: vehicle.model || '',
      seats: vehicle.seats.toString(),
      status: vehicle.status,
    });
    setDialogOpen(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'maintenance': return 'En maintenance';
      case 'inactive': return 'Inactif';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Véhicules ({vehicles.length})</h2>
        <Button onClick={() => { setEditing(null); setForm({ registration_number: '', agency_id: '', brand: '', model: '', seats: '50', status: 'active' }); setDialogOpen(true); }} className="gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead>Marque / Modèle</TableHead>
                <TableHead className="text-center">Places</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.registration_number}</TableCell>
                  <TableCell>{v.agency?.name || '-'}</TableCell>
                  <TableCell>{[v.brand, v.model].filter(Boolean).join(' ') || '-'}</TableCell>
                  <TableCell className="text-center">{v.seats}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      v.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      v.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>{getStatusLabel(v.status)}</span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(v)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (window.confirm(`Supprimer "${v.registration_number}" ?`)) deleteMutation.mutate(v.id); }}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {vehicles.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun véhicule</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Modifier le véhicule' : 'Nouveau véhicule'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Immatriculation *</Label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} placeholder="BUS-01" /></div>
            <div className="grid gap-2">
              <Label>Agence</Label>
              <Select value={form.agency_id} onValueChange={(v) => setForm({ ...form, agency_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{agencies.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Marque</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Modèle</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Places</Label><Input type="number" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} /></div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="maintenance">En maintenance</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.registration_number || saveMutation.isPending}>{saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ---------- USERS TAB ---------- */
const UsersTab = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'cashier', agency_id: '' });
  const [isCreating, setIsCreating] = useState(false);

  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agencies').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*, agency:agencies(*)').order('name');
      if (error) throw error;
      return data;
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      // Create user via Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            role: form.role,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Erreur lors de la création de l\'utilisateur');

      // Update the profile with agency_id after creation
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          agency_id: form.agency_id ? parseInt(form.agency_id) : null,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      audit.userCreate(form.name, getRoleLabel(form.role));
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Utilisateur créé avec succès');
    },
    onError: (error: any) => {
      if (error.message?.includes('already registered')) {
        toast.error('Cet email est déjà utilisé');
      } else {
        toast.error(error.message);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        role: form.role,
        agency_id: form.agency_id ? parseInt(form.agency_id) : null,
      };
      const { error } = await supabase.from('profiles').update(payload).eq('id', editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      audit.userUpdate(form.name, `rôle: ${getRoleLabel(form.role)}`);
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setDialogOpen(false);
      resetForm();
      toast.success('Profil modifié');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete profile (user won't be able to login anymore)
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Utilisateur supprimé');
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
    setEditing(null);
    setIsCreating(false);
    setForm({ name: '', email: '', password: '', role: 'cashier', agency_id: '' });
  };

  const openCreate = () => {
    resetForm();
    setIsCreating(true);
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditing(user);
    setIsCreating(false);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, agency_id: user.agency_id?.toString() || '' });
    setDialogOpen(true);
  };

  const handleDelete = (user: any) => {
    if (window.confirm(`Supprimer l'utilisateur "${user.name}" ?`)) {
      audit.userDelete(user.name);
      deleteMutation.mutate(user.id);
    }
  };

  const handleSave = () => {
    if (isCreating) {
      createUserMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const isPending = createUserMutation.isPending || updateMutation.isPending;
  const canSubmit = isCreating 
    ? form.name && form.email && form.password && form.password.length >= 6
    : form.name;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Utilisateurs ({users.length})</h2>
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Agence</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColorClasses(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </TableCell>
                  <TableCell>{u.agency?.name || '(Central)'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(u)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun utilisateur</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isCreating ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Email *</Label>
              <Input 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
                disabled={!isCreating}
                className={!isCreating ? 'bg-muted' : ''}
              />
            </div>
            {isCreating && (
              <div className="grid gap-2">
                <Label>Mot de passe * (min. 6 caractères)</Label>
                <Input 
                  type="password" 
                  value={form.password} 
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Guichetier</SelectItem>
                  <SelectItem value="accountant">Comptable</SelectItem>
                  <SelectItem value="mechanic">Mécanicien</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Agence</Label>
              <Select value={form.agency_id || 'central'} onValueChange={(v) => setForm({ ...form, agency_id: v === 'central' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="(Central)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Central</SelectItem>
                  {agencies.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!canSubmit || isPending}>
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
