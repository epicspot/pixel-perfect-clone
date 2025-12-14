import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Server, Bell, Shield, Package, Save, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ShipmentPricing {
  id: number;
  type: string;
  base_price: number;
  price_per_kg: number;
  description: string | null;
  is_active: boolean;
}

const shipmentTypeLabels: Record<string, string> = {
  excess_baggage: 'Bagage excédentaire',
  unaccompanied_baggage: 'Bagage non accompagné',
  parcel: 'Colis',
  express: 'Courrier express',
};

const Parametres = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const [editedPricing, setEditedPricing] = useState<Record<string, { base_price: string; price_per_kg: string }>>({});
  const [companyName, setCompanyName] = useState('');
  const [companySlogan, setCompanySlogan] = useState('');

  // Fetch company settings
  const { data: companySettings, isLoading: companyLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Initialize company settings when data loads
  useEffect(() => {
    if (companySettings) {
      setCompanyName(companySettings.company_name || '');
      setCompanySlogan(companySettings.slogan || '');
    }
  }, [companySettings]);
  // Fetch pricing
  const { data: pricing, isLoading: pricingLoading } = useQuery({
    queryKey: ['shipment-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_pricing')
        .select('*')
        .order('type');
      if (error) throw error;
      return data as ShipmentPricing[];
    },
  });

  // Initialize edited pricing when data loads
  useEffect(() => {
    if (pricing) {
      const initial: Record<string, { base_price: string; price_per_kg: string }> = {};
      pricing.forEach(p => {
        initial[p.type] = {
          base_price: p.base_price.toString(),
          price_per_kg: p.price_per_kg.toString(),
        };
      });
      setEditedPricing(initial);
    }
  }, [pricing]);

  // Update pricing mutation
  const updatePricing = useMutation({
    mutationFn: async ({ type, base_price, price_per_kg }: { type: string; base_price: number; price_per_kg: number }) => {
      const { error } = await supabase
        .from('shipment_pricing')
        .update({ base_price, price_per_kg })
        .eq('type', type);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-pricing'] });
      toast.success('Tarif mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  // Update company settings mutation
  const updateCompanySettings = useMutation({
    mutationFn: async ({ company_name, slogan }: { company_name: string; slogan: string }) => {
      const { error } = await supabase
        .from('company_settings')
        .update({ company_name, slogan })
        .eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Paramètres de la compagnie mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const handleSaveCompanySettings = () => {
    if (!companyName.trim()) {
      toast.error('Le nom de la compagnie est requis');
      return;
    }
    updateCompanySettings.mutate({
      company_name: companyName.trim(),
      slogan: companySlogan.trim(),
    });
  };

  const handleSavePricing = (type: string) => {
    const edited = editedPricing[type];
    if (!edited) return;
    
    updatePricing.mutate({
      type,
      base_price: parseFloat(edited.base_price) || 0,
      price_per_kg: parseFloat(edited.price_per_kg) || 0,
    });
  };

  const handlePricingChange = (type: string, field: 'base_price' | 'price_per_kg', value: string) => {
    setEditedPricing(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Configurez votre application</p>
        </div>

        {/* Company Settings - Admin only */}
        {isAdmin && (
          <Card className="p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Identité de la Compagnie</h2>
                <p className="text-sm text-muted-foreground">Personnalisez le nom et le slogan affichés</p>
              </div>
            </div>
            
            {companyLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company-name">Nom de la compagnie</Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: TRANSPORT BURKINA EXPRESS"
                    className="mt-1"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="company-slogan">Slogan</Label>
                  <Input
                    id="company-slogan"
                    value={companySlogan}
                    onChange={(e) => setCompanySlogan(e.target.value)}
                    placeholder="Ex: Votre partenaire de confiance pour tous vos voyages"
                    className="mt-1"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilisez • pour séparer les mots-clés (ex: Sécurité • Confort • Ponctualité)
                  </p>
                </div>
                <Button 
                  onClick={handleSaveCompanySettings}
                  disabled={updateCompanySettings.isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Shipment Pricing Configuration - Admin only */}
        {isAdmin && (
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Tarification Expéditions</h2>
                <p className="text-sm text-muted-foreground">Configurez les tarifs par type d'expédition</p>
              </div>
            </div>
            
            {pricingLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {pricing?.map((item) => (
                  <div key={item.id} className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-[150px]">
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <p className="font-medium">{shipmentTypeLabels[item.type] || item.type}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Frais de base (F)</Label>
                      <Input
                        type="number"
                        value={editedPricing[item.type]?.base_price || ''}
                        onChange={(e) => handlePricingChange(item.type, 'base_price', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Prix/kg (F)</Label>
                      <Input
                        type="number"
                        value={editedPricing[item.type]?.price_per_kg || ''}
                        onChange={(e) => handlePricingChange(item.type, 'price_per_kg', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleSavePricing(item.type)}
                      disabled={updatePricing.isPending}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Notifications */}
        <Card className="p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Bell className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Notifications</h2>
              <p className="text-sm text-muted-foreground">Gérez vos préférences de notification</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Nouveaux tickets</p>
                <p className="text-sm text-muted-foreground">Recevoir une notification pour chaque nouveau ticket</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Alertes de remplissage</p>
                <p className="text-sm text-muted-foreground">Alertes quand un voyage atteint 80% de capacité</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Rapports hebdomadaires</p>
                <p className="text-sm text-muted-foreground">Recevoir un résumé chaque semaine</p>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-accent/10">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Sécurité</h2>
              <p className="text-sm text-muted-foreground">Paramètres de sécurité du compte</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              Changer le mot de passe
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Activer l'authentification à deux facteurs
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
              Déconnecter toutes les sessions
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Parametres;
