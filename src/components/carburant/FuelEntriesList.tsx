import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, FuelEntry } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FuelEntryForm } from './FuelEntryForm';
import { Pencil, Trash2, Fuel } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FuelEntriesListProps {
  from?: string;
  to?: string;
}

export const FuelEntriesList: React.FC<FuelEntriesListProps> = ({ from, to }) => {
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ['fuel-entries', from, to],
    queryFn: () => api.getFuelEntries({ from, to }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteFuelEntry(id),
    onSuccess: () => {
      toast({ title: 'Entrée supprimée' });
      queryClient.invalidateQueries({ queryKey: ['fuel-entries'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-stats-summary'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-stats-vehicle'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' F';

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune entrée de carburant sur la période.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b border-border">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Véhicule</th>
            <th className="px-3 py-2 text-left">Agence</th>
            <th className="px-3 py-2 text-right">Litres</th>
            <th className="px-3 py-2 text-right">Prix/L</th>
            <th className="px-3 py-2 text-right">Montant</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/50">
              <td className="px-3 py-2 text-muted-foreground">
                {entry.filled_at
                  ? format(new Date(entry.filled_at), 'dd MMM yyyy', { locale: fr })
                  : '-'}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-muted-foreground" />
                  <span>{entry.vehicle?.registration_number || '-'}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {entry.vehicle?.agency?.name || entry.agency?.name || '-'}
              </td>
              <td className="px-3 py-2 text-right">{formatNumber(entry.liters)} L</td>
              <td className="px-3 py-2 text-right text-muted-foreground">
                {formatCurrency(entry.price_per_liter)}
              </td>
              <td className="px-3 py-2 text-right font-medium">
                {formatCurrency(entry.total_amount)}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <FuelEntryForm
                    entry={entry}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. L'entrée de carburant sera définitivement supprimée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(entry.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
