import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
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

const fuelEntrySchema = z.object({
  vehicle_id: z.number({ required_error: 'Sélectionnez un véhicule' }),
  liters: z.number().positive('Les litres doivent être positifs'),
  price_per_liter: z.number().positive('Le prix doit être positif'),
  filled_at: z.string().optional(),
});

type FuelEntryFormData = z.infer<typeof fuelEntrySchema>;

export const FuelEntryForm: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const form = useForm<FuelEntryFormData>({
    resolver: zodResolver(fuelEntrySchema),
    defaultValues: {
      liters: 0,
      price_per_liter: 0,
      filled_at: new Date().toISOString().split('T')[0],
    },
  });

  const liters = form.watch('liters');
  const pricePerLiter = form.watch('price_per_liter');
  const totalAmount = (liters || 0) * (pricePerLiter || 0);

  const mutation = useMutation({
    mutationFn: (data: FuelEntryFormData) => {
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
      toast({ title: 'Entrée carburant ajoutée' });
      queryClient.invalidateQueries({ queryKey: ['fuel-stats-summary'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-stats-vehicle'] });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: FuelEntryFormData) => {
    mutation.mutate(data);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle entrée carburant</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div>
            <Label className="text-xs">Date du plein</Label>
            <Input
              type="date"
              {...form.register('filled_at')}
              className="mt-1"
            />
          </div>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Montant total</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
