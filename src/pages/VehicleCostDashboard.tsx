import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Fuel, Wrench, Car, TrendingUp } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Agency {
  id: number;
  name: string;
}

interface Vehicle {
  id: number;
  registration_number: string;
  agency_id: number | null;
  seats: number;
}

interface VehicleCostItem {
  vehicle_id: number;
  registration_number: string;
  agency_id: number | null;
  agency_name: string | null;
  seats: number | null;
  total_fuel_amount: number;
  total_fuel_liters: number;
  total_maintenance_amount: number;
  grand_total_amount: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F CFA';

export default function VehicleCostDashboard() {
  const { profile } = useAuth();
  const now = new Date();
  const [fromDate, setFromDate] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [appliedFilters, setAppliedFilters] = useState({
    from: fromDate,
    to: toDate,
    agencyId: '',
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

  // Fetch vehicles
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration_number, agency_id, seats');
      if (error) throw error;
      return data as Vehicle[];
    },
  });

  // Fetch fuel entries
  const { data: fuelEntries, isLoading: loadingFuel } = useQuery({
    queryKey: ['fuel-entries-stats', appliedFilters],
    queryFn: async () => {
      let query = supabase
        .from('fuel_entries')
        .select('vehicle_id, liters, total_amount, filled_at, agency_id')
        .gte('filled_at', `${appliedFilters.from}T00:00:00`)
        .lte('filled_at', `${appliedFilters.to}T23:59:59`);

      if (appliedFilters.agencyId) {
        query = query.eq('agency_id', Number(appliedFilters.agencyId));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch maintenance orders
  const { data: maintenanceOrders, isLoading: loadingMaint } = useQuery({
    queryKey: ['maintenance-stats', appliedFilters],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_orders')
        .select('vehicle_id, total_cost, opened_at, agency_id')
        .gte('opened_at', `${appliedFilters.from}T00:00:00`)
        .lte('opened_at', `${appliedFilters.to}T23:59:59`);

      if (appliedFilters.agencyId) {
        query = query.eq('agency_id', Number(appliedFilters.agencyId));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate stats per vehicle
  const vehicleCostData = useMemo((): VehicleCostItem[] => {
    if (!vehicles) return [];

    const costMap = new Map<number, VehicleCostItem>();

    // Initialize with all vehicles
    vehicles.forEach((v) => {
      const agency = agencies?.find((a) => a.id === v.agency_id);
      costMap.set(v.id, {
        vehicle_id: v.id,
        registration_number: v.registration_number,
        agency_id: v.agency_id,
        agency_name: agency?.name || null,
        seats: v.seats,
        total_fuel_amount: 0,
        total_fuel_liters: 0,
        total_maintenance_amount: 0,
        grand_total_amount: 0,
      });
    });

    // Add fuel costs
    fuelEntries?.forEach((entry) => {
      if (entry.vehicle_id && costMap.has(entry.vehicle_id)) {
        const item = costMap.get(entry.vehicle_id)!;
        item.total_fuel_amount += Number(entry.total_amount) || 0;
        item.total_fuel_liters += Number(entry.liters) || 0;
      }
    });

    // Add maintenance costs
    maintenanceOrders?.forEach((order) => {
      if (order.vehicle_id && costMap.has(order.vehicle_id)) {
        const item = costMap.get(order.vehicle_id)!;
        item.total_maintenance_amount += Number(order.total_cost) || 0;
      }
    });

    // Calculate totals and filter
    const result: VehicleCostItem[] = [];
    costMap.forEach((item) => {
      item.grand_total_amount = item.total_fuel_amount + item.total_maintenance_amount;
      
      // Filter by agency if selected
      if (appliedFilters.agencyId) {
        if (item.agency_id === Number(appliedFilters.agencyId)) {
          result.push(item);
        }
      } else {
        result.push(item);
      }
    });

    // Sort by total cost descending
    return result.sort((a, b) => b.grand_total_amount - a.grand_total_amount);
  }, [vehicles, agencies, fuelEntries, maintenanceOrders, appliedFilters.agencyId]);

  const totalFuelAmount = vehicleCostData.reduce((sum, v) => sum + v.total_fuel_amount, 0);
  const totalMaintenanceAmount = vehicleCostData.reduce((sum, v) => sum + v.total_maintenance_amount, 0);
  const globalTotal = totalFuelAmount + totalMaintenanceAmount;

  // Top 10 vehicles for chart
  const topVehicles = vehicleCostData.slice(0, 10);

  const chartData = {
    labels: topVehicles.map(
      (v) => `${v.registration_number}${v.agency_name ? ' (' + v.agency_name + ')' : ''}`
    ),
    datasets: [
      {
        label: 'Carburant (F CFA)',
        data: topVehicles.map((v) => v.total_fuel_amount),
        backgroundColor: 'hsl(var(--primary) / 0.8)',
      },
      {
        label: 'Maintenance (F CFA)',
        data: topVehicles.map((v) => v.total_maintenance_amount),
        backgroundColor: 'hsl(var(--destructive) / 0.8)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 9 } },
      },
      y: {
        ticks: { font: { size: 9 } },
      },
    },
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      from: fromDate,
      to: toDate,
      agencyId: selectedAgencyId,
    });
  };

  const isLoading = loadingFuel || loadingMaint;

  const isAdminView = ['admin', 'manager', 'accountant'].includes(profile?.role ?? '');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Coût global par véhicule
          </h1>
          <p className="text-muted-foreground text-sm">
            {isAdminView
              ? 'Comparaison carburant + maintenance pour chaque véhicule'
              : 'Vue des coûts par véhicule'}
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Agence
                </label>
                <Select value={selectedAgencyId || 'all'} onValueChange={(val) => setSelectedAgencyId(val === 'all' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les agences" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les agences</SelectItem>
                    {agencies?.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Du
                </label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Au
                </label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <Button onClick={handleApplyFilters} disabled={isLoading}>
                Appliquer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Fuel className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coût carburant</p>
                  <p className="text-xl font-bold">{formatCurrency(totalFuelAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Wrench className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coût maintenance</p>
                  <p className="text-xl font-bold">{formatCurrency(totalMaintenanceAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coût global parc</p>
                  <p className="text-xl font-bold">{formatCurrency(globalTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Car className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Véhicules</p>
                  <p className="text-xl font-bold">{vehicleCostData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {vehicleCostData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Top véhicules par coût total (carburant + maintenance)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Les 10 véhicules les plus coûteux sur la période
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Bar data={chartData} options={chartOptions as any} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Détail des coûts par véhicule</CardTitle>
              <span className="text-sm text-muted-foreground">
                {vehicleCostData.length} véhicule(s)
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : vehicleCostData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Agence</TableHead>
                    <TableHead className="text-right">Carburant (F)</TableHead>
                    <TableHead className="text-right">Maintenance (F)</TableHead>
                    <TableHead className="text-right">Total (F)</TableHead>
                    <TableHead className="text-right">% carburant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleCostData.map((v) => {
                    const total = v.grand_total_amount || 0;
                    const fuel = v.total_fuel_amount || 0;
                    const fuelRate = total > 0 ? Math.round((fuel / total) * 100) : 0;

                    return (
                      <TableRow key={v.vehicle_id}>
                        <TableCell className="font-medium">{v.registration_number}</TableCell>
                        <TableCell>{v.agency_name || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fuel)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(v.total_maintenance_amount)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(total)}
                        </TableCell>
                        <TableCell className="text-right">{fuelRate}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Car className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Aucune donnée de coût sur la période</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
