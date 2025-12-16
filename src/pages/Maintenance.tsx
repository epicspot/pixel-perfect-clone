import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, MaintenanceOrder, Vehicle } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AgencyFilter } from '@/components/filters/AgencyFilter';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, X, Wrench, CheckCircle, Clock, AlertCircle, AlertTriangle, TrendingUp, Car, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { setGlobalLoading } from '@/hooks/useLoadingProgress';

const Maintenance = () => {
  const { user, profile } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const queryClient = useQueryClient();
  
  const [editing, setEditing] = React.useState<MaintenanceOrder | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [filterStatus, setFilterStatus] = React.useState<string>('');
  const [filterType, setFilterType] = React.useState<string>('');
  const [adminAgencyFilter, setAdminAgencyFilter] = React.useState<string>('');
  
  const [form, setForm] = React.useState({
    vehicle_id: '',
    title: '',
    description: '',
    type: 'corrective' as MaintenanceOrder['type'],
    status: 'open' as MaintenanceOrder['status'],
    total_cost: '',
    odometer_km: '',
  });

  const isAdmin = profile?.role === 'admin';
  
  // Permissions from database
  const canCreateMaintenance = canCreate('maintenance');
  const canEditMaintenance = canEdit('maintenance');
  const canDeleteMaintenance = canDelete('maintenance');
  
  const filterAgencyId = isAdmin 
    ? (adminAgencyFilter ? Number(adminAgencyFilter) : undefined)
    : profile?.agency_id || undefined;

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ['maintenance-orders', filterStatus, filterType, filterAgencyId],
    queryFn: () => api.getMaintenanceOrders({
      status: filterStatus || undefined,
      type: filterType || undefined,
      agency_id: filterAgencyId,
    }),
  });

  // Fetch ALL maintenance orders for dashboard stats (unfiltered by status/type)
  const { data: allMaintenanceData } = useQuery({
    queryKey: ['maintenance-orders-all', filterAgencyId],
    queryFn: () => api.getMaintenanceOrders({
      agency_id: filterAgencyId,
    }),
  });

  // Calculate dashboard stats
  const dashboardStats = React.useMemo(() => {
    const allOrders = allMaintenanceData?.data || [];
    
    // Total counts
    const totalOrders = allOrders.length;
    const openOrders = allOrders.filter(o => o.status === 'open' || o.status === 'in_progress').length;
    const closedOrders = allOrders.filter(o => o.status === 'closed').length;
    const correctiveOrders = allOrders.filter(o => o.type === 'corrective').length;
    const preventiveOrders = allOrders.filter(o => o.type === 'preventive').length;
    
    // Total costs
    const totalCost = allOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
    const correctiveCost = allOrders.filter(o => o.type === 'corrective').reduce((sum, o) => sum + (o.total_cost || 0), 0);
    
    // Vehicle breakdown frequency (corrective maintenance only)
    const vehicleBreakdowns: Record<number, { 
      count: number; 
      totalCost: number; 
      vehicle: Vehicle | undefined;
      lastOrder: MaintenanceOrder | undefined;
    }> = {};
    
    allOrders.forEach(order => {
      if (order.type === 'corrective' && order.vehicle_id) {
        if (!vehicleBreakdowns[order.vehicle_id]) {
          vehicleBreakdowns[order.vehicle_id] = { 
            count: 0, 
            totalCost: 0, 
            vehicle: order.vehicle,
            lastOrder: order 
          };
        }
        vehicleBreakdowns[order.vehicle_id].count++;
        vehicleBreakdowns[order.vehicle_id].totalCost += order.total_cost || 0;
        // Track most recent order
        if (!vehicleBreakdowns[order.vehicle_id].lastOrder || 
            new Date(order.opened_at) > new Date(vehicleBreakdowns[order.vehicle_id].lastOrder!.opened_at)) {
          vehicleBreakdowns[order.vehicle_id].lastOrder = order;
        }
      }
    });
    
    // Sort vehicles by breakdown count
    const vehicleRanking = Object.entries(vehicleBreakdowns)
      .map(([id, data]) => ({ vehicleId: Number(id), ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
    
    const maxBreakdowns = vehicleRanking.length > 0 ? vehicleRanking[0].count : 1;
    
    return {
      totalOrders,
      openOrders,
      closedOrders,
      correctiveOrders,
      preventiveOrders,
      totalCost,
      correctiveCost,
      vehicleRanking,
      maxBreakdowns,
    };
  }, [allMaintenanceData]);

  const createMutation = useMutation({
    mutationFn: async (data: Partial<MaintenanceOrder>) => {
      setGlobalLoading(true);
      return api.createMaintenanceOrder(data);
    },
    onSuccess: () => {
      setGlobalLoading(false);
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      toast.success('Ordre de maintenance créé');
      resetForm();
    },
    onError: () => {
      setGlobalLoading(false);
      toast.error('Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MaintenanceOrder> }) => {
      setGlobalLoading(true);
      return api.updateMaintenanceOrder(id, data);
    },
    onSuccess: () => {
      setGlobalLoading(false);
      queryClient.invalidateQueries({ queryKey: ['maintenance-orders'] });
      toast.success('Ordre de maintenance modifié');
      resetForm();
    },
    onError: () => {
      setGlobalLoading(false);
      toast.error('Erreur lors de la modification');
    },
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
          {canCreateMaintenance && (
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nouvel ordre
            </Button>
          )}
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total ordres</p>
                <p className="text-xl font-bold text-card-foreground">{dashboardStats.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">En cours</p>
                <p className="text-xl font-bold text-card-foreground">{dashboardStats.openOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Correctifs</p>
                <p className="text-xl font-bold text-card-foreground">{dashboardStats.correctiveOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coût total</p>
                <p className="text-lg font-bold text-card-foreground">{formatCurrency(dashboardStats.totalCost)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicles with frequent breakdowns */}
        {dashboardStats.vehicleRanking.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-semibold text-card-foreground">
                Véhicules en panne fréquente
              </h3>
            </div>
            <div className="space-y-3">
              {dashboardStats.vehicleRanking.map((item, index) => {
                const percentage = (item.count / dashboardStats.maxBreakdowns) * 100;
                const isHighRisk = item.count >= 3;
                
                return (
                  <div key={item.vehicleId} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm text-card-foreground">
                            {item.vehicle?.registration_number || `Véhicule #${item.vehicleId}`}
                          </span>
                          {item.vehicle?.brand && (
                            <span className="text-xs text-muted-foreground">
                              ({item.vehicle.brand} {item.vehicle.model})
                            </span>
                          )}
                          {isHighRisk && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                              RISQUE ÉLEVÉ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            {item.count} panne{item.count > 1 ? 's' : ''}
                          </span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(item.totalCost)}
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2"
                        // @ts-ignore
                        indicatorClassName={isHighRisk ? 'bg-red-500' : item.count >= 2 ? 'bg-orange-500' : 'bg-yellow-500'}
                      />
                      {item.lastOrder && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Dernière panne: {formatDate(item.lastOrder.opened_at)} — {item.lastOrder.title}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Cost breakdown */}
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">Coût correctif:</span>
                <span className="font-semibold text-card-foreground">{formatCurrency(dashboardStats.correctiveCost)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Coût préventif:</span>
                <span className="font-semibold text-card-foreground">{formatCurrency(dashboardStats.totalCost - dashboardStats.correctiveCost)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3">
          <AgencyFilter 
            value={adminAgencyFilter} 
            onChange={setAdminAgencyFilter} 
            className="flex-1 min-w-[150px]"
          />
          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs">Statut</Label>
            <Select value={filterStatus || 'all'} onValueChange={(val) => setFilterStatus(val === 'all' ? '' : val)}>
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
            <Select value={filterType || 'all'} onValueChange={(val) => setFilterType(val === 'all' ? '' : val)}>
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
                <Button type="submit" size="sm" disabled={createMutation.isPending || updateMutation.isPending} isLoading={createMutation.isPending || updateMutation.isPending}>
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
                        {canEditMaintenance && (
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(order)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
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
