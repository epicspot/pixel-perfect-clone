import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Agency, RouteRow, Vehicle, User } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, X } from 'lucide-react';

type Tab = 'agencies' | 'routes' | 'vehicles' | 'users';

const Admin = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = React.useState<Tab>('agencies');

  // Check if user has admin access
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
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
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configuration des agences, lignes, véhicules et utilisateurs
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['agencies', 'routes', 'vehicles', 'users'] as Tab[]).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'agencies' && 'Agences'}
              {tab === 'routes' && 'Lignes'}
              {tab === 'vehicles' && 'Véhicules'}
              {tab === 'users' && 'Utilisateurs'}
            </Button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'agencies' && <AgenciesTab />}
        {activeTab === 'routes' && <RoutesTab />}
        {activeTab === 'vehicles' && <VehiclesTab />}
        {activeTab === 'users' && <UsersTab />}
      </div>
    </DashboardLayout>
  );
};

// ============ AGENCIES TAB ============
const AgenciesTab = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState<Agency | null>(null);
  const [form, setForm] = React.useState({ name: '', city: '', address: '', phone: '' });

  const { data: agencies, isLoading } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => api.getAgencies(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Agency, 'id'>) => api.createAgency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success('Agence créée');
      resetForm();
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Agency> }) => api.updateAgency(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success('Agence modifiée');
      resetForm();
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteAgency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success('Agence supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', city: '', address: '', phone: '' });
  };

  const handleEdit = (agency: Agency) => {
    setEditing(agency);
    setForm({
      name: agency.name,
      city: agency.city || '',
      address: agency.address || '',
      phone: agency.phone || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (agency: Agency) => {
    if (window.confirm(`Supprimer l'agence "${agency.name}" ?`)) {
      deleteMutation.mutate(agency.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-card-foreground mb-3">
          {editing ? 'Modifier une agence' : 'Ajouter une agence'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Nom *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Ville</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Adresse</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Téléphone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
          </div>
          <div className="md:col-span-4 flex justify-end gap-2">
            {editing && (
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> Annuler
              </Button>
            )}
            <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
              <Plus className="w-4 h-4 mr-1" /> {editing ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-card-foreground mb-3">Agences ({agencies?.length || 0})</h3>
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Ville</th>
                  <th className="px-3 py-2 text-left">Téléphone</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {agencies?.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.city || '-'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.phone || '-'}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(a)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {(!agencies || agencies.length === 0) && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Aucune agence.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ============ ROUTES TAB ============
const RoutesTab = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState<RouteRow | null>(null);
  const [form, setForm] = React.useState({ name: '', base_price: '', departure_agency_id: '', arrival_agency_id: '' });

  const { data: agencies } = useQuery({ queryKey: ['agencies'], queryFn: () => api.getAgencies() });
  const { data: routes, isLoading } = useQuery({ queryKey: ['routes'], queryFn: () => api.getRoutes() });

  const createMutation = useMutation({
    mutationFn: (data: Omit<RouteRow, 'id' | 'departure_agency' | 'arrival_agency'>) => api.createRoute(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routes'] }); toast.success('Ligne créée'); resetForm(); },
    onError: () => toast.error('Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RouteRow> }) => api.updateRoute(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routes'] }); toast.success('Ligne modifiée'); resetForm(); },
    onError: () => toast.error('Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteRoute(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routes'] }); toast.success('Supprimée'); },
    onError: () => toast.error('Erreur'),
  });

  const resetForm = () => { setEditing(null); setForm({ name: '', base_price: '', departure_agency_id: '', arrival_agency_id: '' }); };

  const handleEdit = (route: RouteRow) => {
    setEditing(route);
    setForm({ name: route.name, base_price: route.base_price.toString(), departure_agency_id: route.departure_agency_id.toString(), arrival_agency_id: route.arrival_agency_id.toString() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, base_price: Number(form.base_price), departure_agency_id: Number(form.departure_agency_id), arrival_agency_id: Number(form.arrival_agency_id) };
    if (editing) { updateMutation.mutate({ id: editing.id, data: payload }); } else { createMutation.mutate(payload); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-3">{editing ? 'Modifier' : 'Ajouter'} une ligne</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
          <div>
            <Label className="text-xs">Départ *</Label>
            <Select value={form.departure_agency_id} onValueChange={(v) => setForm({ ...form, departure_agency_id: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>{agencies?.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Arrivée *</Label>
            <Select value={form.arrival_agency_id} onValueChange={(v) => setForm({ ...form, arrival_agency_id: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>{agencies?.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Prix (F) *</Label><Input type="number" min={0} value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} required className="mt-1" /></div>
          <div className="md:col-span-4 flex justify-end gap-2">
            {editing && <Button type="button" variant="outline" size="sm" onClick={resetForm}><X className="w-4 h-4 mr-1" /> Annuler</Button>}
            <Button type="submit" size="sm"><Plus className="w-4 h-4 mr-1" /> {editing ? 'Modifier' : 'Ajouter'}</Button>
          </div>
        </form>
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">Lignes ({routes?.length || 0})</h3>
        {isLoading ? <Skeleton className="h-20 w-full" /> : (
          <table className="min-w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b"><tr><th className="px-3 py-2 text-left">Nom</th><th className="px-3 py-2 text-left">Départ</th><th className="px-3 py-2 text-left">Arrivée</th><th className="px-3 py-2 text-right">Prix</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
            <tbody>
              {routes?.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.departure_agency?.name || '-'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.arrival_agency?.name || '-'}</td>
                  <td className="px-3 py-2 text-right">{r.base_price} F</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ============ VEHICLES TAB ============
const VehiclesTab = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState<Vehicle | null>(null);
  const [form, setForm] = React.useState({ agency_id: '', registration_number: '', brand: '', model: '', seats: '50', status: 'active' as Vehicle['status'] });

  const { data: agencies } = useQuery({ queryKey: ['agencies'], queryFn: () => api.getAgencies() });
  const { data: vehicles, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.getVehicles() });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Vehicle, 'id' | 'agency'>) => api.createVehicle(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Véhicule créé'); resetForm(); },
    onError: () => toast.error('Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vehicle> }) => api.updateVehicle(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Modifié'); resetForm(); },
    onError: () => toast.error('Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteVehicle(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Supprimé'); },
    onError: () => toast.error('Erreur'),
  });

  const resetForm = () => { setEditing(null); setForm({ agency_id: '', registration_number: '', brand: '', model: '', seats: '50', status: 'active' }); };

  const handleEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({ agency_id: v.agency_id.toString(), registration_number: v.registration_number, brand: v.brand || '', model: v.model || '', seats: v.seats.toString(), status: v.status });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { agency_id: Number(form.agency_id), registration_number: form.registration_number, brand: form.brand || undefined, model: form.model || undefined, seats: Number(form.seats), status: form.status };
    if (editing) { updateMutation.mutate({ id: editing.id, data: payload }); } else { createMutation.mutate(payload as Omit<Vehicle, 'id' | 'agency'>); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold mb-3">{editing ? 'Modifier' : 'Ajouter'} un véhicule</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div><Label className="text-xs">Immat. *</Label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} required className="mt-1" /></div>
          <div>
            <Label className="text-xs">Agence *</Label>
            <Select value={form.agency_id} onValueChange={(v) => setForm({ ...form, agency_id: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{agencies?.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Marque</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs">Modèle</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="mt-1" /></div>
          <div><Label className="text-xs">Places *</Label><Input type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} required className="mt-1" /></div>
          <div>
            <Label className="text-xs">Statut *</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Vehicle['status'] })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 md:col-span-6 flex justify-end gap-2">
            {editing && <Button type="button" variant="outline" size="sm" onClick={resetForm}><X className="w-4 h-4 mr-1" /> Annuler</Button>}
            <Button type="submit" size="sm"><Plus className="w-4 h-4 mr-1" /> {editing ? 'Modifier' : 'Ajouter'}</Button>
          </div>
        </form>
      </div>
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">Véhicules ({vehicles?.length || 0})</h3>
        {isLoading ? <Skeleton className="h-20 w-full" /> : (
          <table className="min-w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b"><tr><th className="px-3 py-2 text-left">Immat.</th><th className="px-3 py-2 text-left">Agence</th><th className="px-3 py-2 text-right">Places</th><th className="px-3 py-2 text-left">Statut</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
            <tbody>
              {vehicles?.map((v) => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="px-3 py-2">{v.registration_number}</td>
                  <td className="px-3 py-2 text-muted-foreground">{v.agency?.name || '-'}</td>
                  <td className="px-3 py-2 text-right">{v.seats}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-1 rounded-full ${v.status === 'active' ? 'bg-green-100 text-green-700' : v.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{v.status}</span></td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(v)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ============ USERS TAB ============
const UsersTab = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState<User | null>(null);
  const [form, setForm] = React.useState({ name: '', role: 'cashier' as User['role'], agency_id: '' });

  const { data: agencies } = useQuery({ queryKey: ['agencies'], queryFn: () => api.getAgencies() });
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.getUsers() });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => api.updateUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur modifié'); resetForm(); },
    onError: () => toast.error('Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Supprimé'); },
    onError: () => toast.error('Erreur'),
  });

  const resetForm = () => { setEditing(null); setForm({ name: '', role: 'cashier', agency_id: '' }); };

  const handleEdit = (u: User) => {
    setEditing(u);
    setForm({ name: u.name, role: u.role, agency_id: u.agency_id?.toString() || '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { name: form.name, role: form.role, agency_id: form.agency_id ? Number(form.agency_id) : undefined } });
    }
  };

  const roleLabels: Record<string, string> = { admin: 'Admin', manager: 'Manager', cashier: 'Guichetier', accountant: 'Comptable', mechanic: 'Mécanicien' };

  return (
    <div className="space-y-4">
      {editing && (
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold mb-3">Modifier l'utilisateur</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label className="text-xs">Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" /></div>
            <div>
              <Label className="text-xs">Rôle *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as User['role'] })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Guichetier</SelectItem>
                  <SelectItem value="accountant">Comptable</SelectItem>
                  <SelectItem value="mechanic">Mécanicien</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Agence</Label>
              <Select value={form.agency_id} onValueChange={(v) => setForm({ ...form, agency_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">(Central)</SelectItem>
                  {agencies?.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={resetForm}><X className="w-4 h-4 mr-1" /> Annuler</Button>
              <Button type="submit" size="sm"><Plus className="w-4 h-4 mr-1" /> Modifier</Button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">Utilisateurs ({users?.length || 0})</h3>
        <p className="text-xs text-muted-foreground mb-3">Les utilisateurs sont créés via l'inscription. Vous pouvez modifier leur rôle et agence ici.</p>
        {isLoading ? <Skeleton className="h-20 w-full" /> : (
          <table className="min-w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b"><tr><th className="px-3 py-2 text-left">Nom</th><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Rôle</th><th className="px-3 py-2 text-left">Agence</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-2"><span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{roleLabels[u.role]}</span></td>
                  <td className="px-3 py-2 text-muted-foreground">{u.agency_name || '(Central)'}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Admin;
