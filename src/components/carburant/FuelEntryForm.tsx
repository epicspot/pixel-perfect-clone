import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, FuelEntry } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FormGrid, FormFieldWrapper, FormActions } from '@/components/ui/responsive-form';
import { setGlobalLoading } from '@/hooks/useLoadingProgress';

const fuelEntrySchema = z.object({
  vehicle_id: z.number({ required_error: 'Sélectionnez un véhicule' }),
  liters: z.number().positive('Les litres doivent être positifs'),
  price_per_liter: z.number().positive('Le prix doit être positif'),
  filled_at: z.string().optional(),
});

type FuelEntryFormData = z.infer<typeof fuelEntrySchema>;

interface FuelEntryFormProps {
  entry?: FuelEntry;
  trigger?: React.ReactNode;
}

export const FuelEntryForm: React.FC<FuelEntryFormProps> = ({ entry, trigger }) => {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const isEditing = !!entry;

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const form = useForm<FuelEntryFormData>({
    resolver: zodResolver(fuelEntrySchema),
    defaultValues: {
      vehicle_id: entry?.vehicle_id || undefined,
      liters: entry?.liters || 0,
      price_per_liter: entry?.price_per_liter || 0,
      filled_at: entry?.filled_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    },
  });

  React.useEffect(() => {
    if (entry && open) {
      form.reset({
        vehicle_id: entry.vehicle_id,
        liters: entry.liters,
        price_per_liter: entry.price_per_liter,
        filled_at: entry.filled_at?.split('T')[0],
      });
    }
  }, [entry, open, form]);

  const liters = form.watch('liters');
  const pricePerLiter = form.watch('price_per_liter');
  const totalAmount = (liters || 0) * (pricePerLiter || 0);

  const createMutation = useMutation({
    mutationFn: async (data: FuelEntryFormData) => {
      setGlobalLoading(true);
      const vehicle = vehicles?.find((v) => v.id === data.vehicle_id);
      return api.createFuelEntry({
        vehicle_id: data.vehicle_id,
        agency_id: vehicle?.agency_id || 0,
        liters: data.liters,
        price_per_liter: data.price_per_liter,
        total_amount: totalAmount,
        filled_at: data.filled_at ? `${data.filled_at}T12:00:00Z` : undefined,
      });
    },
    onSuccess: () => {
      setGlobalLoading(false);
      toast({ title: 'Entrée carburant ajoutée' });
      invalidateQueries();
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      setGlobalLoading(false);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FuelEntryFormData) => {
      setGlobalLoading(true);
      const vehicle = vehicles?.find((v) => v.id === data.vehicle_id);
      return api.updateFuelEntry(entry!.id, {
        vehicle_id: data.vehicle_id,
        agency_id: vehicle?.agency_id || 0,
        liters: data.liters,
        price_per_liter: data.price_per_liter,
        total_amount: totalAmount,
        filled_at: data.filled_at ? `${data.filled_at}T12:00:00Z` : undefined,
      });
    },
    onSuccess: () => {
      setGlobalLoading(false);
      toast({ title: 'Entrée carburant modifiée' });
      invalidateQueries();
      setOpen(false);
    },
    onError: (error: Error) => {
      setGlobalLoading(false);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['fuel-entries'] });
    queryClient.invalidateQueries({ queryKey: ['fuel-stats-summary'] });
    queryClient.invalidateQueries({ queryKey: ['fuel-stats-vehicle'] });
  };

  const onSubmit = (data: FuelEntryFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F CFA';

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {isEditing ? 'Modifier entrée carburant' : 'Nouvelle entrée carburant'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormFieldWrapper fullWidth>
            <Label className="text-xs">Véhicule *</Label>
            <Select
              value={form.watch('vehicle_id')?.toString()}
              onValueChange={(v) => form.setValue('vehicle_id', parseInt(v))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner un véhicule" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {v.registration_number} - {v.brand} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.vehicle_id && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.vehicle_id.message}
              </p>
            )}
          </FormFieldWrapper>

          <FormGrid cols={2} gap={3}>
            <div>
              <Label className="text-xs">Litres *</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('liters', { valueAsNumber: true })}
                className="mt-1"
              />
              {form.formState.errors.liters && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.liters.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Prix / Litre *</Label>
              <Input
                type="number"
                step="1"
                {...form.register('price_per_liter', { valueAsNumber: true })}
                className="mt-1"
              />
              {form.formState.errors.price_per_liter && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.price_per_liter.message}
                </p>
              )}
            </div>
          </FormGrid>

          <FormFieldWrapper fullWidth>
            <Label className="text-xs">Date du plein</Label>
            <Input
              type="date"
              {...form.register('filled_at')}
              className="mt-1"
            />
          </FormFieldWrapper>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Montant total</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
          </div>

          <FormActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button type="submit" disabled={isPending} isLoading={isPending} className="w-full sm:w-auto">
              {isEditing ? 'Modifier' : 'Enregistrer'}
            </Button>
          </FormActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};
