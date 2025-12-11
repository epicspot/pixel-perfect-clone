import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, FileDown, TrendingUp, Truck, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateShipmentsReportPdf } from '@/lib/documentPdf';

type ShipmentType = 'excess_baggage' | 'unaccompanied_baggage' | 'parcel' | 'express';
type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';

interface ShipmentReport {
  id: number;
  reference: string;
  type: ShipmentType;
  sender_name: string;
  receiver_name: string;
  weight_kg: number;
  total_amount: number;
  status: ShipmentStatus;
  created_at: string;
  delivered_at: string | null;
  departure_agency?: { name: string } | null;
  arrival_agency?: { name: string } | null;
}

const shipmentTypeLabels: Record<ShipmentType, string> = {
  excess_baggage: 'Bagage excédentaire',
  unaccompanied_baggage: 'Bagage non accompagné',
  parcel: 'Colis',
  express: 'Courrier express',
};

const statusLabels: Record<ShipmentStatus, string> = {
  pending: 'En attente',
  in_transit: 'En transit',
  delivered: 'Livré',
  cancelled: 'Annulé',
};

const statusColors: Record<ShipmentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function ReportExpeditions() {
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agencyFilter, setAgencyFilter] = useState<string>('all');

  // Fetch agencies
  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => api.getAgencies(),
  });

  // Fetch shipments for report
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments-report', startDate, endDate, typeFilter, statusFilter, agencyFilter],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select(`
          id, reference, type, sender_name, receiver_name, weight_kg, total_amount, status, created_at, delivered_at,
          departure_agency:agencies!shipments_departure_agency_id_fkey(name),
          arrival_agency:agencies!shipments_arrival_agency_id_fkey(name)
        `)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter as ShipmentType);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as ShipmentStatus);
      }
      if (agencyFilter !== 'all') {
        query = query.eq('departure_agency_id', parseInt(agencyFilter));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ShipmentReport[];
    },
  });

  // Calculate stats
  const stats = {
    total: shipments?.length || 0,
    pending: shipments?.filter(s => s.status === 'pending').length || 0,
    inTransit: shipments?.filter(s => s.status === 'in_transit').length || 0,
    delivered: shipments?.filter(s => s.status === 'delivered').length || 0,
    cancelled: shipments?.filter(s => s.status === 'cancelled').length || 0,
    totalRevenue: shipments?.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + s.total_amount, 0) || 0,
    totalWeight: shipments?.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + s.weight_kg, 0) || 0,
    byType: {
      excess_baggage: shipments?.filter(s => s.type === 'excess_baggage' && s.status !== 'cancelled').length || 0,
      unaccompanied_baggage: shipments?.filter(s => s.type === 'unaccompanied_baggage' && s.status !== 'cancelled').length || 0,
      parcel: shipments?.filter(s => s.type === 'parcel' && s.status !== 'cancelled').length || 0,
      express: shipments?.filter(s => s.type === 'express' && s.status !== 'cancelled').length || 0,
    },
  };

  const handleExportPdf = () => {
    if (!shipments || shipments.length === 0) return;
    
    generateShipmentsReportPdf(
      shipments,
      {
        startDate,
        endDate,
        typeFilter: typeFilter !== 'all' ? shipmentTypeLabels[typeFilter as ShipmentType] : undefined,
        agencyFilter: agencyFilter !== 'all' ? agencies?.find(a => a.id === parseInt(agencyFilter))?.name : undefined,
      },
      stats
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Rapport Expéditions</h1>
            <p className="text-muted-foreground">Récapitulatif des expéditions par période</p>
          </div>
          <Button 
            onClick={handleExportPdf}
            disabled={!shipments || shipments.length === 0}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            Exporter PDF
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Date début</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Date fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="excess_baggage">Bagage excédentaire</SelectItem>
                    <SelectItem value="unaccompanied_baggage">Bagage non accompagné</SelectItem>
                    <SelectItem value="parcel">Colis</SelectItem>
                    <SelectItem value="express">Courrier express</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Statut</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="in_transit">En transit</SelectItem>
                    <SelectItem value="delivered">Livré</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Agence départ</Label>
                <Select value={agencyFilter} onValueChange={setAgencyFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {agencies?.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id.toString()}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Package className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inTransit}</p>
                  <p className="text-xs text-muted-foreground">En transit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                  <p className="text-xs text-muted-foreground">Livrés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.totalRevenue.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-muted-foreground">Recettes (F)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.totalWeight.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Poids (kg)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Type breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.byType).map(([type, count]) => (
            <Card key={type}>
              <CardContent className="p-4">
                <p className="text-sm font-medium">{shipmentTypeLabels[type as ShipmentType]}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Détail des expéditions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : shipments?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune expédition pour cette période
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Expéditeur</TableHead>
                      <TableHead>Trajet</TableHead>
                      <TableHead>Poids</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments?.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell className="text-xs">
                          {format(parseISO(shipment.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{shipment.reference}</TableCell>
                        <TableCell className="text-xs">
                          {shipmentTypeLabels[shipment.type]}
                        </TableCell>
                        <TableCell className="text-sm">{shipment.sender_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {shipment.departure_agency?.name} → {shipment.arrival_agency?.name}
                        </TableCell>
                        <TableCell className="text-sm">{shipment.weight_kg} kg</TableCell>
                        <TableCell className="font-semibold">
                          {shipment.total_amount.toLocaleString('fr-FR')} F
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[shipment.status]}>
                            {statusLabels[shipment.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
