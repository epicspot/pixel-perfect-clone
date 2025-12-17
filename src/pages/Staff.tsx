import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Users, Pencil, Trash2, Search } from 'lucide-react';

type StaffType = 'driver' | 'assistant' | 'cashier' | 'admin' | 'mechanic' | 'other';

interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  job_title: string | null;
  staff_type: StaffType;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  base_salary: number | null;
  is_active: boolean;
  agency_id: number | null;
}

interface Agency {
  id: number;
  name: string;
}

const staffTypeLabels: Record<StaffType, string> = {
  driver: 'Chauffeur',
  assistant: 'Apprenti',
  cashier: 'Guichetier',
  admin: 'Admin',
  mechanic: 'Mécanicien',
  other: 'Autre',
};

const formatCurrency = (value: number | null) =>
  value ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F CFA' : '-';

export default function Staff() {
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    job_title: '',
    staff_type: 'other' as StaffType,
    phone: '',
    email: '',
    hire_date: '',
    base_salary: '',
    agency_id: '',
    is_active: true,
  });

  // Fetch staff
  const { data: staffList, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('last_name');
      if (error) throw error;
      return data as Staff[];
    },
  });

  // Fetch agencies
  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as Agency[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { error } = await supabase.from('staff').insert({
        first_name: data.first_name,
        last_name: data.last_name,
        job_title: data.job_title || null,
        staff_type: data.staff_type,
        phone: data.phone || null,
        email: data.email || null,
        hire_date: data.hire_date || null,
        base_salary: data.base_salary ? Number(data.base_salary) : null,
        agency_id: data.agency_id ? Number(data.agency_id) : null,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Personnel ajouté');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof form }) => {
      const { error } = await supabase
        .from('staff')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          job_title: data.job_title || null,
          staff_type: data.staff_type,
          phone: data.phone || null,
          email: data.email || null,
          hire_date: data.hire_date || null,
          base_salary: data.base_salary ? Number(data.base_salary) : null,
          agency_id: data.agency_id ? Number(data.agency_id) : null,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Personnel modifié');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Personnel supprimé');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setForm({
      first_name: '',
      last_name: '',
      job_title: '',
      staff_type: 'other',
      phone: '',
      email: '',
      hire_date: '',
      base_salary: '',
      agency_id: '',
      is_active: true,
    });
    setEditingStaff(null);
    setDialogOpen(false);
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setForm({
      first_name: staff.first_name,
      last_name: staff.last_name,
      job_title: staff.job_title || '',
      staff_type: staff.staff_type,
      phone: staff.phone || '',
      email: staff.email || '',
      hire_date: staff.hire_date || '',
      base_salary: staff.base_salary?.toString() || '',
      agency_id: staff.agency_id?.toString() || '',
      is_active: staff.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const filteredStaff = staffList?.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = staffList?.filter((s) => s.is_active).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Gestion du Personnel
            </h1>
            <p className="text-muted-foreground text-sm">
              {activeCount} employés actifs sur {staffList?.length || 0}
            </p>
          </div>
          {canCreate('staff') && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingStaff ? 'Modifier le personnel' : 'Ajouter du personnel'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prénom *</Label>
                    <Input
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={form.staff_type}
                      onValueChange={(v) => setForm({ ...form, staff_type: v as StaffType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(staffTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Poste</Label>
                    <Input
                      value={form.job_title}
                      onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Agence</Label>
                    <Select
                      value={form.agency_id}
                      onValueChange={(v) => setForm({ ...form, agency_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {agencies?.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date d'embauche</Label>
                    <Input
                      type="date"
                      value={form.hire_date}
                      onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Salaire de base (F CFA)</Label>
                  <Input
                    type="number"
                    value={form.base_salary}
                    onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingStaff ? 'Modifier' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredStaff && filteredStaff.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom complet</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Poste</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead className="text-right">Salaire</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.full_name}</TableCell>
                      <TableCell>{staffTypeLabels[staff.staff_type]}</TableCell>
                      <TableCell>{staff.job_title || '-'}</TableCell>
                      <TableCell>{staff.phone || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(staff.base_salary)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={staff.is_active ? 'default' : 'secondary'}>
                          {staff.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEdit('staff') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(staff)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete('staff') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer ce personnel ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(staff.id)}
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Aucun personnel trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
