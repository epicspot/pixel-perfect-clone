import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FuelEntryForm } from '@/components/carburant/FuelEntryForm';
import { FuelEntriesList } from '@/components/carburant/FuelEntriesList';
import { Fuel, TrendingUp, Building2, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

const Carburant = () => {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [agencyId, setAgencyId] = React.useState<string>('');
  const [year, setYear] = React.useState<number>(new Date().getFullYear());
  const [appliedFrom, setAppliedFrom] = React.useState<string | undefined>();
  const [appliedTo, setAppliedTo] = React.useState<string | undefined>();
  const [appliedAgency, setAppliedAgency] = React.useState<number | undefined>();
  const [appliedYear, setAppliedYear] = React.useState<number>(new Date().getFullYear());
  
  // Permissions from database
  const canCreateFuel = canCreate('carburant');
  const canEditFuel = canEdit('carburant');
  const canDeleteFuel = canDelete('carburant');

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => api.getAgencies(),
  });

  const { data: summaryStats, isLoading: loadingSummary } = useQuery({
    queryKey: ['fuel-stats-summary', appliedFrom, appliedTo],
    queryFn: () => api.getFuelStatsSummary({
      from: appliedFrom,
      to: appliedTo,
    }),
  });

  const { data: vehicleStats, isLoading: loadingVehicle } = useQuery({
    queryKey: ['fuel-stats-vehicle', appliedFrom, appliedTo],
    queryFn: () => api.getFuelStatsPerVehicle({
      from: appliedFrom,
      to: appliedTo,
    }),
  });

  const { data: monthlyStats, isLoading: loadingMonthly } = useQuery({
    queryKey: ['fuel-stats-monthly', appliedYear, appliedAgency],
    queryFn: () => api.getFuelStatsPerMonth({
      year: appliedYear,
      agency_id: appliedAgency,
    }),
  });

  const handleApplyFilter = () => {
    setAppliedFrom(fromDate || undefined);
    setAppliedTo(toDate || undefined);
    setAppliedAgency(agencyId ? Number(agencyId) : undefined);
    setAppliedYear(year);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

  const isLoading = loadingSummary || loadingVehicle;

  // Chart data for monthly costs
  const costChartData = {
    labels: monthlyStats?.data.map(m => m.month_label) || [],
    datasets: [
      {
        label: 'Coût carburant (F CFA)',
        data: monthlyStats?.data.map(m => m.total_amount) || [],
        backgroundColor: 'hsl(var(--primary) / 0.9)',
        borderRadius: 4,
      },
    ],
  };

  // Chart data for monthly liters
  const litersChartData = {
    labels: monthlyStats?.data.map(m => m.month_label) || [],
    datasets: [
      {
        label: 'Litres consommés',
        data: monthlyStats?.data.map(m => m.total_liters) || [],
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointBackgroundColor: 'hsl(var(--primary))',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--popover-foreground))',
        bodyColor: 'hsl(var(--popover-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        padding: 12,
        bodyFont: { size: 12 },
        titleFont: { size: 12, weight: 'bold' as const },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: 'hsl(var(--muted-foreground))' },
      },
      y: {
        grid: { color: 'hsl(var(--border) / 0.5)' },
        ticks: { font: { size: 11 }, color: 'hsl(var(--muted-foreground))' },
      },
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Carburant & Parc</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Suivi des consommations et coûts carburant
            </p>
          </div>
          {canCreateFuel && <FuelEntryForm />}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs">Agence</Label>
            <Select value={agencyId} onValueChange={(val) => setAgencyId(val === 'all' ? '' : val)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Toutes les agences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les agences</SelectItem>
                {agencies?.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-xs">Du</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <Label className="text-xs">Au</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-none w-[100px]">
            <Label className="text-xs">Année (graphique)</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
              className="mt-1"
            />
          </div>
          <Button onClick={handleApplyFilter} size="sm">
            Appliquer
          </Button>
        </div>

        {/* Global Stats */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        ) : summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Total carburant (L)"
              value={formatNumber(summaryStats.global.total_liters) + ' L'}
              icon={Fuel}
            />
            <StatCard
              title="Coût total (F CFA)"
              value={formatCurrency(summaryStats.global.total_amount)}
              icon={TrendingUp}
            />
            <StatCard
              title="Prix moyen / litre"
              value={formatCurrency(summaryStats.global.average_liter_price)}
              icon={BarChart3}
            />
            <StatCard
              title="Agences consommatrices"
              value={String(summaryStats.per_agency?.length || 0)}
              icon={Building2}
            />
          </div>
        )}

        {/* Monthly Charts */}
        {monthlyStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-4">
                Coût carburant par mois ({monthlyStats.year})
              </h3>
              <div className="h-[250px]">
                {loadingMonthly ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <Bar data={costChartData} options={chartOptions} />
                )}
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-4">
                Quantités consommées (L) par mois
              </h3>
              <div className="h-[250px]">
                {loadingMonthly ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <Line data={litersChartData} options={chartOptions} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Per Agency */}
        {summaryStats?.per_agency && summaryStats.per_agency.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">
              Consommation par agence
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left">Agence</th>
                    <th className="px-3 py-2 text-right">Litres</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryStats.per_agency.map((row) => (
                    <tr key={row.agency_id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="px-3 py-2">{row.agency_name}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatNumber(row.total_liters)} L
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(row.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fuel Entries List */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-3">
            Historique des pleins
          </h3>
          <FuelEntriesList from={appliedFrom} to={appliedTo} canEdit={canEditFuel} canDelete={canDeleteFuel} />
        </div>

        {/* Per Vehicle */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold text-card-foreground mb-3">
            Consommation par véhicule ({vehicleStats?.per_vehicle?.length || 0})
          </h3>
          {loadingVehicle ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left">Véhicule</th>
                    <th className="px-3 py-2 text-left">Agence</th>
                    <th className="px-3 py-2 text-right">Places</th>
                    <th className="px-3 py-2 text-right">Nb. Pleins</th>
                    <th className="px-3 py-2 text-right">Litres</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleStats?.per_vehicle?.map((row) => (
                    <tr key={row.vehicle_id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-muted-foreground" />
                          <span>{row.registration_number}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.agency_name}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{row.seats}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{row.fuel_count}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(row.total_liters)} L</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.total_amount)}</td>
                    </tr>
                  ))}
                  {(!vehicleStats?.per_vehicle || vehicleStats.per_vehicle.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                        Aucune donnée de carburant sur la période.
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

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon }) => (
  <div className="bg-card rounded-xl border border-border p-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-xl font-bold text-card-foreground">{value}</p>
      </div>
    </div>
  </div>
);

export default Carburant;
