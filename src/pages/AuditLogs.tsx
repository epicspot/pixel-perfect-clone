import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AgencyFilter } from '@/components/filters/AgencyFilter';
import { ScrollText, Search, Filter, User, Calendar, Activity } from 'lucide-react';

interface AuditLog {
  id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  user_id: string | null;
  agency_id: number | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  profile?: {
    name: string;
    email: string;
  } | null;
  agency?: {
    name: string;
  } | null;
}

const actionConfig: Record<string, { label: string; color: string }> = {
  LOGIN: { label: 'Connexion', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  LOGOUT: { label: 'Déconnexion', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  TICKET_SALE: { label: 'Vente ticket', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  TICKET_CANCEL: { label: 'Annulation ticket', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  TICKET_REFUND: { label: 'Remboursement', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  TICKET_PRINT: { label: 'Impression ticket', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  TRIP_CREATE: { label: 'Création voyage', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  TRIP_UPDATE: { label: 'Modification voyage', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  TRIP_DELETE: { label: 'Suppression voyage', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  TRIP_STATUS_CHANGE: { label: 'Changement statut', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  CASH_CLOSURE_CREATE: { label: 'Clôture caisse', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  CASH_CLOSURE_VALIDATE: { label: 'Validation clôture', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  EXPENSE_CREATE: { label: 'Nouvelle dépense', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  EXPENSE_DELETE: { label: 'Suppression dépense', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  FUEL_ENTRY_CREATE: { label: 'Entrée carburant', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400' },
  MAINTENANCE_CREATE: { label: 'Ordre maintenance', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400' },
  PAYROLL_VALIDATE: { label: 'Validation paie', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
  PAYROLL_PAY: { label: 'Paiement salaire', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
  USER_CREATE: { label: 'Création utilisateur', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
  USER_UPDATE: { label: 'Modification utilisateur', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
  USER_DELETE: { label: 'Suppression utilisateur', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  PDF_EXPORT: { label: 'Export PDF', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
  EXCEL_EXPORT: { label: 'Export Excel', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
};

const entityLabels: Record<string, string> = {
  ticket: 'Ticket',
  trip: 'Voyage',
  cash_closure: 'Clôture caisse',
  expense: 'Dépense',
  fuel_entry: 'Carburant',
  maintenance_order: 'Maintenance',
  payroll_entry: 'Paie',
  user: 'Utilisateur',
  report: 'Rapport',
};

export default function AuditLogs() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [adminAgencyFilter, setAdminAgencyFilter] = useState('');

  const isAdmin = profile?.role === 'admin';

  // Fetch audit logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', adminAgencyFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          agency:agencies(name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (adminAgencyFilter) {
        query = query.eq('agency_id', Number(adminAgencyFilter));
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately for user names
      const userIds = [...new Set(data?.map(log => log.user_id).filter(Boolean))];
      let profilesMap: Record<string, { name: string; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = { name: p.name, email: p.email };
        });
      }
      
      return data?.map(log => ({
        ...log,
        profile: log.user_id ? profilesMap[log.user_id] : null,
      })) as AuditLog[];
    },
    enabled: isAdmin,
  });

  // Filter logs
  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  // Stats
  const todayLogs = logs?.filter((log) => {
    const today = new Date().toISOString().split('T')[0];
    return log.created_at.startsWith(today);
  });

  const uniqueUsers = new Set(logs?.map((log) => log.user_id)).size;

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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <ScrollText className="w-7 h-7 text-primary" />
              Journal d'Audit
            </h1>
            <p className="text-muted-foreground text-sm">
              Historique de toutes les actions effectuées dans l'application
            </p>
          </div>
          <AgencyFilter
            value={adminAgencyFilter}
            onChange={setAdminAgencyFilter}
            className="min-w-[180px]"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{logs?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total actions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayLogs?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <User className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueUsers}</p>
                  <p className="text-xs text-muted-foreground">Utilisateurs actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Filter className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{filteredLogs?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Résultats filtrés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par description, action ou utilisateur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Filtrer par action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {Object.entries(actionConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historique des actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[180px]">Date & Heure</TableHead>
                    <TableHead className="w-[140px]">Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[150px]">Utilisateur</TableHead>
                    <TableHead className="w-[120px]">Agence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun log trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log) => {
                      const config = actionConfig[log.action] || {
                        label: log.action,
                        color: 'bg-gray-100 text-gray-800',
                      };
                      return (
                        <TableRow key={log.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[10px] ${config.color}`}>
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.description || '-'}
                            {log.entity_type && log.entity_id && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({entityLabels[log.entity_type] || log.entity_type} #{log.entity_id})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.profile?.name || 'Système'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.agency?.name || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
