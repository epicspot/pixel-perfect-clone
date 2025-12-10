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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Calendar, Users, Wallet, FileText } from 'lucide-react';

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
}

interface Staff {
  id: number;
  full_name: string;
  base_salary: number | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

export default function Paie() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('periods');
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);

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
        .select('id, full_name, base_salary')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Staff[];
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

  // Close period mutation
  const closePeriodMutation = useMutation({
    mutationFn: async (id: number) => {
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

  const getStaffName = (id: number) =>
    staffList?.find((s) => s.id === id)?.full_name || '-';

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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedPeriod.label}</h2>
                    <p className="text-sm text-muted-foreground">
                      Total net: {formatCurrency(totalNet)} ({entries?.length || 0} fiches)
                    </p>
                  </div>
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

                <Card>
                  <CardContent className="pt-6">
                    {loadingEntries ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : entries && entries.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employé</TableHead>
                            <TableHead className="text-right">Salaire base</TableHead>
                            <TableHead className="text-right">Primes</TableHead>
                            <TableHead className="text-right">Indemnités</TableHead>
                            <TableHead className="text-right">Retenues</TableHead>
                            <TableHead className="text-right">Net</TableHead>
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
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Aucune fiche de paie</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
