import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, TrendingUp, Ticket, CreditCard, Loader2, Banknote, Smartphone, Users, Building2, FileText, ChevronDown, ChevronUp, Download, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AgencyFilter } from '@/components/filters/AgencyFilter';
import { generateCashiersReportPdf } from '@/lib/reportsPdf';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F CFA';
};

const getPaymentIcon = (method: string) => {
  switch (method) {
    case 'cash':
      return <Banknote className="w-4 h-4" />;
    case 'mobile_money':
      return <Smartphone className="w-4 h-4" />;
    case 'card':
      return <CreditCard className="w-4 h-4" />;
    default:
      return <Wallet className="w-4 h-4" />;
  }
};

const getPaymentLabel = (method: string) => {
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

interface CashierSummary {
  cashier_id: string;
  cashier_name: string;
  agency_name: string;
  tickets_count: number;
  total_amount: number;
  cash_amount: number;
  mm_amount: number;
  card_amount: number;
  other_amount: number;
}

interface TicketDetail {
  id: number;
  reference: string | null;
  seat_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  price: number;
  payment_method: string | null;
  sold_at: string | null;
  route_name: string;
  agency_name: string;
}

const ReportCashiers = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [adminAgencyFilter, setAdminAgencyFilter] = useState('');
  const [expandedCashier, setExpandedCashier] = useState<string | null>(null);

  const filterAgencyId = isAdmin 
    ? (adminAgencyFilter ? Number(adminAgencyFilter) : undefined)
    : profile?.agency_id || undefined;

  // Fetch cashiers list
  const { data: cashiers } = useQuery({
    queryKey: ['cashiers-list', filterAgencyId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, name, agency_id')
        .in('role', ['cashier', 'admin', 'manager']);

      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch journal data
  const { data: journalData, isLoading } = useQuery({
    queryKey: ['cashier-journal', fromDate, toDate, selectedCashier, filterAgencyId],
    queryFn: async () => {
      // Get all paid tickets in date range
      let query = supabase
        .from('tickets')
        .select(`
          id,
          reference,
          seat_number,
          customer_name,
          customer_phone,
          price,
          total_amount,
          payment_method,
          sold_at,
          seller_id,
          agency_id,
          trip:trips(
            route:routes(
              name,
              departure_agency:agencies!routes_departure_agency_id_fkey(id, name)
            ),
            vehicle:vehicles(
              agency:agencies(id, name)
            )
          )
        `)
        .gte('sold_at', `${fromDate}T00:00:00`)
        .lte('sold_at', `${toDate}T23:59:59`)
        .eq('status', 'paid')
        .order('sold_at', { ascending: false });

      // Filter by agency
      if (filterAgencyId) {
        query = query.eq('agency_id', filterAgencyId);
      }

      // Filter by specific cashier
      if (selectedCashier && selectedCashier !== 'all') {
        query = query.eq('seller_id', selectedCashier);
      }

      const { data: tickets, error } = await query;
      if (error) throw error;

      // Get seller names
      const sellerIds = [...new Set(tickets?.map(t => t.seller_id).filter(Boolean))];
      let sellersMap: Record<string, { name: string; agency_name: string }> = {};
      
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, name, agency:agencies(name)')
          .in('id', sellerIds);
        
        sellers?.forEach(s => {
          sellersMap[s.id] = {
            name: s.name,
            agency_name: (s.agency as any)?.name || 'N/A'
          };
        });
      }

      // Group by cashier for summary
      const summaryMap: Record<string, CashierSummary> = {};
      
      tickets?.forEach(ticket => {
        const cashierId = ticket.seller_id || 'unknown';
        const seller = sellersMap[cashierId] || { name: 'Inconnu', agency_name: 'N/A' };
        
        if (!summaryMap[cashierId]) {
          summaryMap[cashierId] = {
            cashier_id: cashierId,
            cashier_name: seller.name,
            agency_name: seller.agency_name,
            tickets_count: 0,
            total_amount: 0,
            cash_amount: 0,
            mm_amount: 0,
            card_amount: 0,
            other_amount: 0,
          };
        }
        
        const amount = ticket.total_amount || ticket.price || 0;
        summaryMap[cashierId].tickets_count++;
        summaryMap[cashierId].total_amount += amount;
        
        switch (ticket.payment_method) {
          case 'cash':
            summaryMap[cashierId].cash_amount += amount;
            break;
          case 'mobile_money':
            summaryMap[cashierId].mm_amount += amount;
            break;
          case 'card':
            summaryMap[cashierId].card_amount += amount;
            break;
          default:
            summaryMap[cashierId].other_amount += amount;
        }
      });

      const summary = Object.values(summaryMap).sort((a, b) => a.cashier_name.localeCompare(b.cashier_name));

      // Prepare ticket details
      const ticketsDetail: TicketDetail[] = tickets?.map(t => ({
        id: t.id,
        reference: t.reference,
        seat_number: t.seat_number,
        customer_name: t.customer_name,
        customer_phone: t.customer_phone,
        price: t.total_amount || t.price,
        payment_method: t.payment_method,
        sold_at: t.sold_at,
        route_name: (t.trip as any)?.route?.name || 'N/A',
        agency_name: (t.trip as any)?.vehicle?.agency?.name || 'N/A',
        cashier_id: t.seller_id,
        cashier_name: sellersMap[t.seller_id || '']?.name || 'Inconnu',
      })) || [];

      // Calculate totals
      const totals = {
        tickets_count: summary.reduce((sum, s) => sum + s.tickets_count, 0),
        total_amount: summary.reduce((sum, s) => sum + s.total_amount, 0),
        cash_amount: summary.reduce((sum, s) => sum + s.cash_amount, 0),
        mm_amount: summary.reduce((sum, s) => sum + s.mm_amount, 0),
        card_amount: summary.reduce((sum, s) => sum + s.card_amount, 0),
        other_amount: summary.reduce((sum, s) => sum + s.other_amount, 0),
      };

      return { summary, tickets: ticketsDetail, totals };
    },
    enabled: !!fromDate && !!toDate,
  });

  // Company settings for PDF
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

  const getTicketsForCashier = (cashierId: string) => {
    return journalData?.tickets.filter((t: any) => t.cashier_id === cashierId) || [];
  };

  const handleExportPdf = () => {
    if (!journalData) return;
    const reportData = {
      rows: journalData.summary.map((s) => ({
        cashier_name: s.cashier_name,
        agency_name: s.agency_name,
        sessions_count: 0, // Not tracked in this view
        tickets_sold: s.tickets_count,
        total_sales: s.total_amount,
        total_discrepancy: 0,
      })),
      totals: {
        sessions: 0,
        tickets: journalData.totals.tickets_count,
        sales: journalData.totals.total_amount,
        discrepancy: 0,
      },
    };
    generateCashiersReportPdf(reportData, { start: new Date(fromDate), end: new Date(toDate) }, {
      name: companySettings?.company_name || 'Transport Express',
      logoUrl: companySettings?.logo_url,
      address: companySettings?.address || '',
      phone: companySettings?.phone || '',
      email: companySettings?.email || '',
      rccm: companySettings?.rccm || '',
      ifu: companySettings?.ifu || '',
    });
    toast.success('PDF généré');
  };

  const handleExportExcel = () => {
    if (!journalData) return;
    const data = journalData.summary.map((s) => ({
      'Caissier': s.cashier_name,
      'Agence': s.agency_name,
      'Tickets': s.tickets_count,
      'Total': s.total_amount,
      'Espèces': s.cash_amount,
      'Mobile Money': s.mm_amount,
      'Carte': s.card_amount,
      'Autre': s.other_amount,
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal Caissiers');
    XLSX.writeFile(wb, `journal_caissiers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel généré');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Journal de Caisse</h1>
            <p className="text-muted-foreground mt-1">
              Suivi des encaissements par guichetier
            </p>
          </div>
          {journalData && journalData.summary.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPdf}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <AgencyFilter 
              value={adminAgencyFilter} 
              onChange={setAdminAgencyFilter}
              className="min-w-[180px]"
            />
            <div className="space-y-1.5">
              <Label className="text-sm">Du</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Au</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-sm">Guichetier</Label>
              <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les guichetiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les guichetiers</SelectItem>
                  {cashiers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Summary Cards */}
        {journalData && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4 border-l-4 border-l-primary">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(journalData.totals.total_amount)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Ticket className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tickets</p>
                  <p className="text-lg font-bold">{journalData.totals.tickets_count}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Espèces</p>
                  <p className="text-lg font-bold">{formatCurrency(journalData.totals.cash_amount)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mobile Money</p>
                  <p className="text-lg font-bold">{formatCurrency(journalData.totals.mm_amount)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Carte</p>
                  <p className="text-lg font-bold">{formatCurrency(journalData.totals.card_amount)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Autre</p>
                  <p className="text-lg font-bold">{formatCurrency(journalData.totals.other_amount)}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Summary by Cashier */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Résumé par guichetier</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : journalData && journalData.summary.length > 0 ? (
            <div className="divide-y divide-border">
              {journalData.summary.map((cashier) => (
                <div key={cashier.cashier_id}>
                  {/* Cashier row */}
                  <div 
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedCashier(
                      expandedCashier === cashier.cashier_id ? null : cashier.cashier_id
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {cashier.cashier_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{cashier.cashier_name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3" />
                            {cashier.agency_name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(cashier.total_amount)}</p>
                          <p className="text-xs text-muted-foreground">{cashier.tickets_count} tickets</p>
                        </div>
                        <div className="hidden md:flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Banknote className="w-3 h-3 text-emerald-600" />
                            <span>{formatCurrency(cashier.cash_amount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-orange-600" />
                            <span>{formatCurrency(cashier.mm_amount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-blue-600" />
                            <span>{formatCurrency(cashier.card_amount)}</span>
                          </div>
                        </div>
                        {expandedCashier === cashier.cashier_id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded ticket details */}
                  {expandedCashier === cashier.cashier_id && (
                    <div className="bg-muted/30 px-4 pb-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead>Heure</TableHead>
                            <TableHead>Référence</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Trajet</TableHead>
                            <TableHead>Paiement</TableHead>
                            <TableHead className="text-right">Montant</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getTicketsForCashier(cashier.cashier_id).map((ticket: any) => (
                            <TableRow key={ticket.id} className="text-sm">
                              <TableCell>
                                {ticket.sold_at ? format(new Date(ticket.sold_at), 'HH:mm', { locale: fr }) : '-'}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{ticket.reference || '-'}</TableCell>
                              <TableCell>{ticket.customer_name || 'Anonyme'}</TableCell>
                              <TableCell className="text-muted-foreground">{ticket.route_name}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1">
                                  {getPaymentIcon(ticket.payment_method || '')}
                                  <span className="text-xs">{getPaymentLabel(ticket.payment_method || '')}</span>
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(ticket.price)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune transaction pour cette période</p>
            </div>
          )}
        </Card>

        {/* Totals Footer */}
        {journalData && journalData.summary.length > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-semibold">Totaux de la période</span>
                <span className="text-sm text-muted-foreground">
                  ({format(new Date(fromDate), 'dd/MM/yyyy')} - {format(new Date(toDate), 'dd/MM/yyyy')})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(journalData.totals.total_amount)}</p>
                  <p className="text-xs text-muted-foreground">{journalData.totals.tickets_count} tickets</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportCashiers;
