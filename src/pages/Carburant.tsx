import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FuelEntryForm } from '@/components/carburant/FuelEntryForm';
import { FuelEntriesList } from '@/components/carburant/FuelEntriesList';
import { Fuel, TrendingUp } from 'lucide-react';

const Carburant = () => {
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [agencyId, setAgencyId] = React.useState<string>('');
  const [appliedFrom, setAppliedFrom] = React.useState<string | undefined>();
  const [appliedTo, setAppliedTo] = React.useState<string | undefined>();
  const [appliedAgency, setAppliedAgency] = React.useState<number | undefined>();

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

  const handleApplyFilter = () => {
    setAppliedFrom(fromDate || undefined);
    setAppliedTo(toDate || undefined);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

  const isLoading = loadingSummary || loadingVehicle;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Carburant</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Statistiques et gestion des entrées de carburant
            </p>
          </div>
          <FuelEntryForm />
        </div>

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs">Du</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs">Au</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs">Agence</Label>
            <Select value={agencyId} onValueChange={setAgencyId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Toutes les agences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les agences</SelectItem>
                {agencies?.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleApplyFilter} size="sm">
            Appliquer
          </Button>
        </div>

        {/* Global Stats */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        ) : summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Litres"
              value={formatNumber(summaryStats.global.total_liters) + ' L'}
              icon={Fuel}
            />
            <StatCard
              title="Montant Total"
              value={formatCurrency(summaryStats.global.total_amount)}
              icon={TrendingUp}
            />
            <StatCard
              title="Prix Moyen / Litre"
              value={formatCurrency(summaryStats.global.average_liter_price)}
              icon={Fuel}
            />
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
          <FuelEntriesList from={appliedFrom} to={appliedTo} />
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
