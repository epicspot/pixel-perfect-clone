import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, MaintenanceOrder, Vehicle } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, X, Wrench, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const Maintenance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [editing, setEditing] = React.useState<MaintenanceOrder | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>('');
  const [filterType, setFilterType] = React.useState<string>('');
  
  const [form, setForm] = React.useState({
    vehicle_id: '',
    title: '',
    description: '',
    type: 'corrective' as MaintenanceOrder['type'],
    status: 'open' as MaintenanceOrder['status'],
    total_cost: '',
    odometer_km: '',
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ['maintenance-orders', filterStatus, filterType],
    queryFn: () => api.getMaintenanceOrders({
      status: filterStatus || undefined,
      type: filterType || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<MaintenanceOrder>) => api.createMaintenanceOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      toast.success('Ordre de maintenance créé');
      resetForm();
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MaintenanceOrder> }) => api.updateMaintenanceOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      toast.success('Ordre de maintenance modifié');
      resetForm();
    },
    onError: () => toast.error('Erreur lors de la modification'),
  });

  const resetForm = () => {
    setEditing(null);
    setShowForm(false);
    setForm({
      vehicle_id: '',
      title: '',
      description: '',
      type: 'corrective',
      status: 'open',
      total_cost: '',
      odometer_km: '',
    });
  };

  const handleEdit = (order: MaintenanceOrder) => {
    setEditing(order);
    setShowForm(true);
    setForm({
      vehicle_id: order.vehicle_id.toString(),
      title: order.title,
      description: order.description || '',
      type: order.type,
      status: order.status,
      total_cost: order.total_cost?.toString() || '',
      odometer_km: order.odometer_km?.toString() || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<MaintenanceOrder> = {
      vehicle_id: Number(form.vehicle_id),
      title: form.title,
      description: form.description || undefined,
      type: form.type,
      status: form.status,
      total_cost: form.total_cost ? Number(form.total_cost) : undefined,
      odometer_km: form.odometer_km ? Number(form.odometer_km) : undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'closed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <X className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const statusLabels: Record<string, string> = {
    open: 'Ouvert',
    in_progress: 'En cours',
    closed: 'Clôturé',
    cancelled: 'Annulé',
  };

  const typeLabels: Record<string, string> = {
    preventive: 'Préventive',
    corrective: 'Corrective',
    other: 'Autre',
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch {
      return dateStr;
    }
  };

  const orders = maintenanceData?.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Maintenance</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestion des ordres de maintenance des véhicules
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Nouvel ordre
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs">Statut</Label>
          <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="open">Ouvert</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="closed">Clôturé</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs">Type</Label>
            <Select value={filterType || "all"} onValueChange={(v) => setFilterType(v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="preventive">Préventive</SelectItem>
                <SelectItem value="corrective">Corrective</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-semibold text-card-foreground mb-3">
              {editing ? 'Modifier l\'ordre de maintenance' : 'Nouvel ordre de maintenance'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Véhicule *</Label>
                  <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map((v) => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          {v.registration_number} - {v.brand} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Type *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as MaintenanceOrder['type'] })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Préventive</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Statut *</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MaintenanceOrder['status'] })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Ouvert</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="closed">Clôturé</SelectItem>
                      <SelectItem value="cancelled">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Titre *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Changement de pneus"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Détails de l'intervention..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Coût total (F CFA)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.total_cost}
                    onChange={(e) => setForm({ ...form, total_cost: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Kilométrage (km)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.odometer_km}
                    onChange={(e) => setForm({ ...form, odometer_km: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4 mr-1" /> Annuler
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending}>
                  <Plus className="w-4 h-4 mr-1" /> {editing ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-3">
            Ordres de maintenance ({orders.length})
          </h3>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left">Véhicule</th>
                    <th className="px-3 py-2 text-left">Titre</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Coût</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-muted-foreground" />
                          <span>{order.vehicle?.registration_number || '-'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium">{order.title}</p>
                          {order.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {order.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {typeLabels[order.type]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          <span className="text-xs">{statusLabels[order.status]}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(order.opened_at)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {order.total_cost ? formatCurrency(order.total_cost) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(order)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                        Aucun ordre de maintenance.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Maintenance;
