import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Server, Bell, Shield, Package, Save, Building2, Upload, X, Image, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [discrepancyThreshold, setDiscrepancyThreshold] = useState('5000');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setCompanyAddress(companySettings.address || '');
      setCompanyPhone(companySettings.phone || '');
      setCompanyEmail(companySettings.email || '');
      setLogoUrl(companySettings.logo_url || null);
    }
  }, [companySettings]);

  // Fetch discrepancy threshold
  const { data: thresholdSetting, isLoading: thresholdLoading } = useQuery({
    queryKey: ['cash-discrepancy-threshold'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'cash_discrepancy_threshold')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Initialize threshold when data loads
  useEffect(() => {
    if (thresholdSetting) {
      setDiscrepancyThreshold(thresholdSetting.value || '5000');
    }
  }, [thresholdSetting]);

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
    mutationFn: async ({ company_name, slogan, address, phone, email }: { company_name: string; slogan: string; address: string; phone: string; email: string }) => {
      const { error } = await supabase
        .from('company_settings')
        .update({ company_name, slogan, address, phone, email })
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

  // Update discrepancy threshold mutation
  const updateThreshold = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', 'cash_discrepancy_threshold');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-discrepancy-threshold'] });
      toast.success('Seuil d\'alerte mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const handleSaveThreshold = () => {
    const value = parseInt(discrepancyThreshold);
    if (isNaN(value) || value < 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }
    updateThreshold.mutate(value.toString());
  };

  const handleSaveCompanySettings = () => {
    if (!companyName.trim()) {
      toast.error('Le nom de la compagnie est requis');
      return;
    }
    updateCompanySettings.mutate({
      company_name: companyName.trim(),
      slogan: companySlogan.trim(),
      address: companyAddress.trim(),
      phone: companyPhone.trim(),
      email: companyEmail.trim(),
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `company/${fileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      // Update company settings with the logo URL
      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ logo_url: publicUrl })
        .eq('id', 1);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Logo mis à jour');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setUploading(true);
    try {
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('company-assets')
        .remove(['company/logo.png', 'company/logo.jpg', 'company/logo.jpeg', 'company/logo.webp']);

      if (deleteError) console.warn('Could not delete logo file:', deleteError);

      // Update company settings
      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ logo_url: null })
        .eq('id', 1);

      if (updateError) throw updateError;

      setLogoUrl(null);
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Logo supprimé');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setUploading(false);
    }
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

                {/* Address */}
                <div>
                  <Label htmlFor="company-address">Adresse</Label>
                  <Input
                    id="company-address"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Ex: 01 BP 1234, Ouagadougou 01, Burkina Faso"
                    className="mt-1"
                    maxLength={200}
                  />
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-phone">Téléphone</Label>
                    <Input
                      id="company-phone"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="Ex: +226 25 30 00 00"
                      className="mt-1"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-email">Email</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="Ex: contact@transport.bf"
                      className="mt-1"
                      maxLength={100}
                    />
                  </div>
                </div>
                
                {/* Logo Upload */}
                <div>
                  <Label>Logo de la compagnie</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {logoUrl ? (
                      <div className="relative group">
                        <img 
                          src={logoUrl} 
                          alt="Logo" 
                          className="w-16 h-16 object-contain rounded-lg border border-border bg-muted p-1"
                        />
                        <button
                          onClick={handleRemoveLogo}
                          disabled={uploading}
                          className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {logoUrl ? 'Changer le logo' : 'Télécharger un logo'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG ou WebP. Max 2 Mo.
                      </p>
                    </div>
                  </div>
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

        {/* Cash Discrepancy Alert Settings - Admin only */}
        {isAdmin && (
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '75ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Alertes Écarts de Caisse</h2>
                <p className="text-sm text-muted-foreground">Configurez le seuil pour déclencher une alerte automatique</p>
              </div>
            </div>
            
            {thresholdLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="threshold">Seuil d'alerte (F CFA)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Une alerte sera créée si l'écart de caisse dépasse ce montant (en valeur absolue)
                    </p>
                    <Input
                      id="threshold"
                      type="number"
                      value={discrepancyThreshold}
                      onChange={(e) => setDiscrepancyThreshold(e.target.value)}
                      placeholder="5000"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveThreshold}
                    disabled={updateThreshold.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Les managers et administrateurs recevront une notification en temps réel lorsqu'un caissier fermera une session avec un écart dépassant ce seuil.
                </p>
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
