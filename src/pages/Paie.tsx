import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Calendar, Users, Wallet, FileText, BarChart3, Building2, Download, Pencil, Trash2, CheckCircle, XCircle, Banknote } from 'lucide-react';
import { generatePayslipPdf, generatePeriodSummaryPdf, generateAllPeriodsStatsPdf } from '@/lib/payrollPdf';

interface PayrollPeriod {
  id: number;
  start_date: string;
  end_date: string;
  label: string;
  status: 'open' | 'closed';
}

interface PayrollEntry {
  id: number;
  payroll_period_id: number;
  staff_id: number;
  base_salary: number;
  bonuses: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  paid_at: string | null;
  payment_method: string | null;
  validated_at: string | null;
  validated_by: string | null;
}

interface Staff {
  id: number;
  full_name: string;
  base_salary: number | null;
  agency_id: number | null;
}

interface Agency {
  id: number;
  name: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

export default function Paie() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('periods');
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<PayrollEntry | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [bulkPaymentDialogOpen, setBulkPaymentDialogOpen] = useState(false);
  const [entryToPay, setEntryToPay] = useState<PayrollEntry | null>(null);

  const [periodForm, setPeriodForm] = useState({
    start_date: '',
    end_date: '',
    label: '',
  });

  const [entryForm, setEntryForm] = useState({
    staff_id: '',
    base_salary: '',
    bonuses: '0',
    allowances: '0',
    deductions: '0',
  });

  const [editForm, setEditForm] = useState({
    base_salary: '',
    bonuses: '0',
    allowances: '0',
    deductions: '0',
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'cash',
    paid_at: new Date().toISOString().split('T')[0],
  });

  // Fetch periods
  const { data: periods, isLoading: loadingPeriods } = useQuery({
    queryKey: ['payroll-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as PayrollPeriod[];
    },
  });

  // Fetch entries for selected period
  const { data: entries, isLoading: loadingEntries } = useQuery({
    queryKey: ['payroll-entries', selectedPeriod?.id],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      const { data, error } = await supabase
        .from('payroll_entries')
        .select('*')
        .eq('payroll_period_id', selectedPeriod.id);
      if (error) throw error;
      return data as PayrollEntry[];
    },
    enabled: !!selectedPeriod,
  });

  // Fetch staff
  const { data: staffList } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, base_salary, agency_id')
        .eq('is_active', true)
        .order('full_name');
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

  // Fetch all payroll entries with staff info for stats
  const { data: allEntries, isLoading: loadingAllEntries } = useQuery({
    queryKey: ['payroll-all-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_entries')
        .select('*, staff:staff(full_name, agency_id)');
      if (error) throw error;
      return data;
    },
  });

  // Create period mutation
  const createPeriodMutation = useMutation({
    mutationFn: async (data: typeof periodForm) => {
      const { error } = await supabase.from('payroll_periods').insert({
        start_date: data.start_date,
        end_date: data.end_date,
        label: data.label,
        status: 'open',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Période créée');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
      setPeriodDialogOpen(false);
      setPeriodForm({ start_date: '', end_date: '', label: '' });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: typeof entryForm) => {
      const base = Number(data.base_salary);
      const bonuses = Number(data.bonuses);
      const allowances = Number(data.allowances);
      const deductions = Number(data.deductions);
      const net = base + bonuses + allowances - deductions;

      const { error } = await supabase.from('payroll_entries').insert({
        payroll_period_id: selectedPeriod!.id,
        staff_id: Number(data.staff_id),
        base_salary: base,
        bonuses,
        allowances,
        deductions,
        net_salary: net,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fiche de paie ajoutée');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      setEntryDialogOpen(false);
      setEntryForm({
        staff_id: '',
        base_salary: '',
        bonuses: '0',
        allowances: '0',
        deductions: '0',
      });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async (data: { id: number; base_salary: number; bonuses: number; allowances: number; deductions: number }) => {
      const net = data.base_salary + data.bonuses + data.allowances - data.deductions;
      const { error } = await supabase
        .from('payroll_entries')
        .update({
          base_salary: data.base_salary,
          bonuses: data.bonuses,
          allowances: data.allowances,
          deductions: data.deductions,
          net_salary: net,
          validated_at: null,
          validated_by: null,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fiche de paie modifiée');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-all-entries'] });
      setEditEntryDialogOpen(false);
      setEditingEntry(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('payroll_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fiche de paie supprimée');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-all-entries'] });
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Validate entry mutation
  const validateEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('payroll_entries')
        .update({
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fiche validée');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-all-entries'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Invalidate entry validation mutation
  const invalidateEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('payroll_entries')
        .update({
          validated_at: null,
          validated_by: null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Validation annulée');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-all-entries'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Validate all entries mutation
  const validateAllEntriesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPeriod) return;
      const { error } = await supabase
        .from('payroll_entries')
        .update({
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
        })
        .eq('payroll_period_id', selectedPeriod.id)
        .is('validated_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Toutes les fiches validées');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-all-entries'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Close period mutation
  const closePeriodMutation = useMutation({
    mutationFn: async (id: number) => {
      // Check if all entries are validated
      const unvalidatedCount = entries?.filter(e => !e.validated_at).length || 0;
      if (unvalidatedCount > 0) {
        throw new Error(`${unvalidatedCount} fiche(s) non validée(s). Validez toutes les fiches avant de clôturer.`);
      }
      const { error } = await supabase
        .from('payroll_periods')
        .update({ status: 'closed' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Période clôturée');
      queryClient.invalidateQueries({ queryKey: ['payroll-periods'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mark entry as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (data: { id: number; payment_method: string; paid_at: string }) => {
      const { error } = await supabase
        .from('payroll_entries')
        .update({
          payment_method: data.payment_method,
          paid_at: data.paid_at,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Paiement enregistré');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-all-entries'] });
      setPaymentDialogOpen(false);
      setEntryToPay(null);
      setPaymentForm({ payment_method: 'cash', paid_at: new Date().toISOString().split('T')[0] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Cancel payment mutation
  const cancelPaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('payroll_entries')
        .update({
          payment_method: null,
          paid_at: null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Paiement annulé');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-all-entries'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Bulk payment mutation
  const bulkPaymentMutation = useMutation({
    mutationFn: async (data: { payment_method: string; paid_at: string }) => {
      if (!selectedPeriod || !entries) return;
      const validatedUnpaidIds = entries
        .filter(e => e.validated_at && !e.paid_at)
        .map(e => e.id);
      
      if (validatedUnpaidIds.length === 0) {
        throw new Error('Aucune fiche à payer');
      }

      const { error } = await supabase
        .from('payroll_entries')
        .update({
          payment_method: data.payment_method,
          paid_at: data.paid_at,
        })
        .in('id', validatedUnpaidIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Toutes les fiches validées ont été payées');
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-all-entries'] });
      setBulkPaymentDialogOpen(false);
      setPaymentForm({ payment_method: 'cash', paid_at: new Date().toISOString().split('T')[0] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const getStaffName = (id: number) =>
    staffList?.find((s) => s.id === id)?.full_name || '-';

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'mobile_money': return 'Mobile Money';
      case 'card': return 'Carte';
      case 'bank_transfer': return 'Virement';
      default: return method || '-';
    }
  };

  const handleStaffSelect = (staffId: string) => {
    const staff = staffList?.find((s) => s.id === Number(staffId));
    setEntryForm({
      ...entryForm,
      staff_id: staffId,
      base_salary: staff?.base_salary?.toString() || '',
    });
  };

  const totalNet = entries?.reduce((acc, e) => acc + Number(e.net_salary), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Gestion de la Paie
            </h1>
            <p className="text-muted-foreground text-sm">
              Périodes de paie et fiches de salaire
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="periods">
              <Calendar className="w-4 h-4 mr-2" />
              Périodes
            </TabsTrigger>
            <TabsTrigger value="entries" disabled={!selectedPeriod}>
              <FileText className="w-4 h-4 mr-2" />
              Fiches de paie
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="w-4 h-4 mr-2" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          {/* Periods Tab */}
          <TabsContent value="periods" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle période
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer une période de paie</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createPeriodMutation.mutate(periodForm);
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label>Libellé *</Label>
                      <Input
                        value={periodForm.label}
                        onChange={(e) =>
                          setPeriodForm({ ...periodForm, label: e.target.value })
                        }
                        placeholder="ex: Janvier 2025"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date début *</Label>
                        <Input
                          type="date"
                          value={periodForm.start_date}
                          onChange={(e) =>
                            setPeriodForm({ ...periodForm, start_date: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label>Date fin *</Label>
                        <Input
                          type="date"
                          value={periodForm.end_date}
                          onChange={(e) =>
                            setPeriodForm({ ...periodForm, end_date: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPeriodDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={createPeriodMutation.isPending}>
                        Créer
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                {loadingPeriods ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : periods && periods.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead>Du</TableHead>
                        <TableHead>Au</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((period) => (
                        <TableRow key={period.id}>
                          <TableCell className="font-medium">{period.label}</TableCell>
                          <TableCell>
                            {format(new Date(period.start_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(period.end_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={period.status === 'open' ? 'default' : 'secondary'}
                            >
                              {period.status === 'open' ? 'Ouverte' : 'Clôturée'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPeriod(period);
                                  setActiveTab('entries');
                                }}
                              >
                                Voir fiches
                              </Button>
                              {period.status === 'open' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => closePeriodMutation.mutate(period.id)}
                                >
                                  Clôturer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Aucune période créée</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            {selectedPeriod && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedPeriod.label}</h2>
                    <p className="text-sm text-muted-foreground">
                      Total net: {formatCurrency(totalNet)} ({entries?.length || 0} fiches)
                      {entries && entries.length > 0 && (
                        <span className="ml-2">
                          • {entries.filter(e => e.validated_at).length} validée(s)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entries && entries.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => generatePeriodSummaryPdf(selectedPeriod, entries, staffList || [])}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export PDF
                        </Button>
                        {selectedPeriod.status === 'open' && entries.some(e => !e.validated_at) && (
                          <Button
                            variant="secondary"
                            onClick={() => validateAllEntriesMutation.mutate()}
                            disabled={validateAllEntriesMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Tout valider
                          </Button>
                        )}
                        {entries.some(e => e.validated_at && !e.paid_at) && (
                          <Button
                            variant="default"
                            onClick={() => {
                              setPaymentForm({
                                payment_method: 'cash',
                                paid_at: new Date().toISOString().split('T')[0],
                              });
                              setBulkPaymentDialogOpen(true);
                            }}
                          >
                            <Banknote className="w-4 h-4 mr-2" />
                            Tout payer ({entries.filter(e => e.validated_at && !e.paid_at).length})
                          </Button>
                        )}
                      </>
                    )}
                    {selectedPeriod.status === 'open' && (
                      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter fiche
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Nouvelle fiche de paie</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              createEntryMutation.mutate(entryForm);
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <Label>Employé *</Label>
                              <Select
                                value={entryForm.staff_id}
                                onValueChange={handleStaffSelect}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                  {staffList?.map((s) => (
                                    <SelectItem key={s.id} value={s.id.toString()}>
                                      {s.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Salaire de base *</Label>
                                <Input
                                  type="number"
                                  value={entryForm.base_salary}
                                  onChange={(e) =>
                                    setEntryForm({ ...entryForm, base_salary: e.target.value })
                                  }
                                  required
                                />
                              </div>
                              <div>
                                <Label>Primes</Label>
                                <Input
                                  type="number"
                                  value={entryForm.bonuses}
                                  onChange={(e) =>
                                    setEntryForm({ ...entryForm, bonuses: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Indemnités</Label>
                                <Input
                                  type="number"
                                  value={entryForm.allowances}
                                  onChange={(e) =>
                                    setEntryForm({ ...entryForm, allowances: e.target.value })
                                  }
                                />
                              </div>
                              <div>
                                <Label>Retenues</Label>
                                <Input
                                  type="number"
                                  value={entryForm.deductions}
                                  onChange={(e) =>
                                    setEntryForm({ ...entryForm, deductions: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted">
                              <p className="text-sm text-muted-foreground">Net à payer</p>
                              <p className="text-xl font-bold">
                                {formatCurrency(
                                  Number(entryForm.base_salary || 0) +
                                    Number(entryForm.bonuses || 0) +
                                    Number(entryForm.allowances || 0) -
                                    Number(entryForm.deductions || 0)
                                )}
                              </p>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEntryDialogOpen(false)}
                              >
                                Annuler
                              </Button>
                              <Button type="submit" disabled={createEntryMutation.isPending}>
                                Ajouter
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    {loadingEntries ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : entries && entries.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employé</TableHead>
                              <TableHead className="text-right">Salaire base</TableHead>
                              <TableHead className="text-right">Primes</TableHead>
                              <TableHead className="text-right">Indemnités</TableHead>
                              <TableHead className="text-right">Retenues</TableHead>
                              <TableHead className="text-right">Net</TableHead>
                              <TableHead className="text-center">Validation</TableHead>
                              <TableHead className="text-center">Paiement</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">
                                  {getStaffName(entry.staff_id)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(entry.base_salary)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(entry.bonuses)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(entry.allowances)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(entry.deductions)}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatCurrency(entry.net_salary)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {entry.validated_at ? (
                                    <Badge variant="default" className="bg-green-600">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Validée
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">
                                      En attente
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {entry.paid_at ? (
                                    <div className="space-y-1">
                                      <Badge variant="default" className="bg-blue-600">
                                        <Banknote className="w-3 h-3 mr-1" />
                                        Payé
                                      </Badge>
                                      <p className="text-xs text-muted-foreground">
                                        {getPaymentMethodLabel(entry.payment_method)}
                                        <br />
                                        {format(new Date(entry.paid_at), 'dd/MM/yyyy')}
                                      </p>
                                    </div>
                                  ) : (
                                    <Badge variant="secondary">
                                      Non payé
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => generatePayslipPdf(entry, selectedPeriod, getStaffName(entry.staff_id))}
                                      title="Télécharger PDF"
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                    {/* Payment actions - available for validated entries */}
                                    {entry.validated_at && !entry.paid_at && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEntryToPay(entry);
                                          setPaymentForm({
                                            payment_method: 'cash',
                                            paid_at: new Date().toISOString().split('T')[0],
                                          });
                                          setPaymentDialogOpen(true);
                                        }}
                                        title="Enregistrer le paiement"
                                      >
                                        <Banknote className="w-4 h-4 text-blue-500" />
                                      </Button>
                                    )}
                                    {entry.paid_at && selectedPeriod.status === 'open' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => cancelPaymentMutation.mutate(entry.id)}
                                        title="Annuler le paiement"
                                      >
                                        <XCircle className="w-4 h-4 text-orange-500" />
                                      </Button>
                                    )}
                                    {selectedPeriod.status === 'open' && (
                                      <>
                                        {entry.validated_at ? (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => invalidateEntryMutation.mutate(entry.id)}
                                            title="Annuler validation"
                                            disabled={!!entry.paid_at}
                                          >
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                          </Button>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => validateEntryMutation.mutate(entry.id)}
                                            title="Valider"
                                          >
                                            <CheckCircle className="w-4 h-4 text-muted-foreground" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingEntry(entry);
                                            setEditForm({
                                              base_salary: entry.base_salary.toString(),
                                              bonuses: entry.bonuses.toString(),
                                              allowances: entry.allowances.toString(),
                                              deductions: entry.deductions.toString(),
                                            });
                                            setEditEntryDialogOpen(true);
                                          }}
                                          title="Modifier"
                                          disabled={!!entry.paid_at}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEntryToDelete(entry);
                                            setDeleteDialogOpen(true);
                                          }}
                                          title="Supprimer"
                                          disabled={!!entry.paid_at}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Aucune fiche de paie</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Edit Entry Dialog */}
                <Dialog open={editEntryDialogOpen} onOpenChange={setEditEntryDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Modifier la fiche de {editingEntry ? getStaffName(editingEntry.staff_id) : ''}
                      </DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingEntry) {
                          updateEntryMutation.mutate({
                            id: editingEntry.id,
                            base_salary: Number(editForm.base_salary),
                            bonuses: Number(editForm.bonuses),
                            allowances: Number(editForm.allowances),
                            deductions: Number(editForm.deductions),
                          });
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Salaire de base *</Label>
                          <Input
                            type="number"
                            value={editForm.base_salary}
                            onChange={(e) =>
                              setEditForm({ ...editForm, base_salary: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label>Primes</Label>
                          <Input
                            type="number"
                            value={editForm.bonuses}
                            onChange={(e) =>
                              setEditForm({ ...editForm, bonuses: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Indemnités</Label>
                          <Input
                            type="number"
                            value={editForm.allowances}
                            onChange={(e) =>
                              setEditForm({ ...editForm, allowances: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label>Retenues</Label>
                          <Input
                            type="number"
                            value={editForm.deductions}
                            onChange={(e) =>
                              setEditForm({ ...editForm, deductions: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Net à payer</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            Number(editForm.base_salary || 0) +
                              Number(editForm.bonuses || 0) +
                              Number(editForm.allowances || 0) -
                              Number(editForm.deductions || 0)
                          )}
                        </p>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditEntryDialogOpen(false);
                            setEditingEntry(null);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={updateEntryMutation.isPending}>
                          Enregistrer
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Payment Dialog */}
                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Enregistrer le paiement - {entryToPay ? getStaffName(entryToPay.staff_id) : ''}
                      </DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (entryToPay) {
                          markPaidMutation.mutate({
                            id: entryToPay.id,
                            payment_method: paymentForm.payment_method,
                            paid_at: paymentForm.paid_at,
                          });
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Montant net à payer</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(entryToPay?.net_salary || 0)}
                        </p>
                      </div>
                      <div>
                        <Label>Méthode de paiement *</Label>
                        <Select
                          value={paymentForm.payment_method}
                          onValueChange={(value) =>
                            setPaymentForm({ ...paymentForm, payment_method: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Espèces</SelectItem>
                            <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                            <SelectItem value="card">Carte bancaire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date de paiement *</Label>
                        <Input
                          type="date"
                          value={paymentForm.paid_at}
                          onChange={(e) =>
                            setPaymentForm({ ...paymentForm, paid_at: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setPaymentDialogOpen(false);
                            setEntryToPay(null);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={markPaidMutation.isPending}>
                          <Banknote className="w-4 h-4 mr-2" />
                          Confirmer le paiement
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Bulk Payment Dialog */}
                <Dialog open={bulkPaymentDialogOpen} onOpenChange={setBulkPaymentDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Paiement groupé</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        bulkPaymentMutation.mutate({
                          payment_method: paymentForm.payment_method,
                          paid_at: paymentForm.paid_at,
                        });
                      }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">Fiches à payer</p>
                        <p className="text-2xl font-bold">
                          {entries?.filter(e => e.validated_at && !e.paid_at).length || 0} fiches
                        </p>
                        <p className="text-lg font-semibold text-primary mt-1">
                          Total: {formatCurrency(
                            entries?.filter(e => e.validated_at && !e.paid_at)
                              .reduce((sum, e) => sum + e.net_salary, 0) || 0
                          )}
                        </p>
                      </div>
                      <div>
                        <Label>Méthode de paiement *</Label>
                        <Select
                          value={paymentForm.payment_method}
                          onValueChange={(value) =>
                            setPaymentForm({ ...paymentForm, payment_method: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Espèces</SelectItem>
                            <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                            <SelectItem value="card">Carte bancaire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Date de paiement *</Label>
                        <Input
                          type="date"
                          value={paymentForm.paid_at}
                          onChange={(e) =>
                            setPaymentForm({ ...paymentForm, paid_at: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setBulkPaymentDialogOpen(false)}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={bulkPaymentMutation.isPending}>
                          <Banknote className="w-4 h-4 mr-2" />
                          Confirmer le paiement groupé
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer la fiche de paie de{' '}
                        <strong>{entryToDelete ? getStaffName(entryToDelete.staff_id) : ''}</strong> ?
                        Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setEntryToDelete(null)}>
                        Annuler
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (entryToDelete) {
                            deleteEntryMutation.mutate(entryToDelete.id);
                          }
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            {/* Export button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                disabled={!periods || periods.length === 0}
                onClick={() => generateAllPeriodsStatsPdf(periods || [], allEntries || [], agencies || [], staffList || [])}
              >
                <Download className="w-4 h-4 mr-2" />
                Export rapport PDF
              </Button>
            </div>

            {/* Global KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total périodes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{periods?.length || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total fiches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{allEntries?.length || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Masse salariale totale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(
                      allEntries?.reduce((sum, e) => sum + Number(e.net_salary), 0) || 0
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Employés payés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {new Set(allEntries?.map((e) => e.staff_id)).size || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Stats by Period */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Récapitulatif par période
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPeriods || loadingAllEntries ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : periods && periods.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead className="text-right">Fiches</TableHead>
                        <TableHead className="text-right">Salaire base</TableHead>
                        <TableHead className="text-right">Primes</TableHead>
                        <TableHead className="text-right">Net total</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((period) => {
                        const periodEntries = allEntries?.filter(
                          (e) => e.payroll_period_id === period.id
                        ) || [];
                        const totalBase = periodEntries.reduce(
                          (sum, e) => sum + Number(e.base_salary),
                          0
                        );
                        const totalBonuses = periodEntries.reduce(
                          (sum, e) => sum + Number(e.bonuses),
                          0
                        );
                        const totalNet = periodEntries.reduce(
                          (sum, e) => sum + Number(e.net_salary),
                          0
                        );
                        return (
                          <TableRow key={period.id}>
                            <TableCell className="font-medium">{period.label}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(period.start_date), 'dd/MM')} -{' '}
                              {format(new Date(period.end_date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-right">{periodEntries.length}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalBase)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalBonuses)}</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(totalNet)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={period.status === 'open' ? 'default' : 'secondary'}>
                                {period.status === 'open' ? 'Ouverte' : 'Clôturée'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune période disponible
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats by Agency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Récapitulatif par agence
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAllEntries ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : agencies && agencies.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agence</TableHead>
                        <TableHead className="text-right">Employés</TableHead>
                        <TableHead className="text-right">Fiches</TableHead>
                        <TableHead className="text-right">Masse salariale</TableHead>
                        <TableHead className="text-right">Moyenne/employé</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencies.map((agency) => {
                        const agencyEntries = allEntries?.filter(
                          (e: any) => e.staff?.agency_id === agency.id
                        ) || [];
                        const uniqueStaff = new Set(agencyEntries.map((e) => e.staff_id)).size;
                        const totalNet = agencyEntries.reduce(
                          (sum, e) => sum + Number(e.net_salary),
                          0
                        );
                        const avgPerStaff = uniqueStaff > 0 ? totalNet / uniqueStaff : 0;

                        if (agencyEntries.length === 0) return null;

                        return (
                          <TableRow key={agency.id}>
                            <TableCell className="font-medium">{agency.name}</TableCell>
                            <TableCell className="text-right">{uniqueStaff}</TableCell>
                            <TableCell className="text-right">{agencyEntries.length}</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(totalNet)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(avgPerStaff)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Entries without agency */}
                      {(() => {
                        const noAgencyEntries = allEntries?.filter(
                          (e: any) => !e.staff?.agency_id
                        ) || [];
                        if (noAgencyEntries.length === 0) return null;
                        const uniqueStaff = new Set(noAgencyEntries.map((e) => e.staff_id)).size;
                        const totalNet = noAgencyEntries.reduce(
                          (sum, e) => sum + Number(e.net_salary),
                          0
                        );
                        return (
                          <TableRow>
                            <TableCell className="font-medium text-muted-foreground">
                              Sans agence
                            </TableCell>
                            <TableCell className="text-right">{uniqueStaff}</TableCell>
                            <TableCell className="text-right">{noAgencyEntries.length}</TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(totalNet)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(uniqueStaff > 0 ? totalNet / uniqueStaff : 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
