import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Server, Bell, Shield, Package, Save, Building2, Upload, X, Image, AlertTriangle, Hash, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  
  // Numbering settings
  const [ticketPrefix, setTicketPrefix] = useState('TKT');
  const [ticketSeparator, setTicketSeparator] = useState('-');
  const [ticketDigits, setTicketDigits] = useState('6');
  const [ticketIncludeAgency, setTicketIncludeAgency] = useState(true);
  const [ticketIncludeYear, setTicketIncludeYear] = useState(true);
  const [manifestPrefix, setManifestPrefix] = useState('MAN');
  const [manifestSeparator, setManifestSeparator] = useState('-');
  const [manifestDigits, setManifestDigits] = useState('5');
  const [manifestIncludeAgency, setManifestIncludeAgency] = useState(true);
  const [manifestIncludeDate, setManifestIncludeDate] = useState(true);
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

  // Fetch all app settings
  const { data: appSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  // Initialize settings when data loads
  useEffect(() => {
    if (appSettings) {
      const findSetting = (key: string) => appSettings.find(s => s.key === key)?.value;
      
      setDiscrepancyThreshold(findSetting('cash_discrepancy_threshold') || '5000');
      setTicketPrefix(findSetting('ticket_prefix') || 'TKT');
      setTicketSeparator(findSetting('ticket_separator') || '-');
      setTicketDigits(findSetting('ticket_digits') || '6');
      setTicketIncludeAgency(findSetting('ticket_include_agency') !== 'false');
      setTicketIncludeYear(findSetting('ticket_include_year') !== 'false');
      setManifestPrefix(findSetting('manifest_prefix') || 'MAN');
      setManifestSeparator(findSetting('manifest_separator') || '-');
      setManifestDigits(findSetting('manifest_digits') || '5');
      setManifestIncludeAgency(findSetting('manifest_include_agency') !== 'false');
      setManifestIncludeDate(findSetting('manifest_include_date') !== 'false');
    }
  }, [appSettings]);

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

  // Update app setting mutation
  const updateAppSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Try to update first
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
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
    updateAppSetting.mutate({ key: 'cash_discrepancy_threshold', value: value.toString() });
    toast.success('Seuil d\'alerte mis à jour');
  };

  const handleSaveNumberingSettings = async () => {
    try {
      await Promise.all([
        updateAppSetting.mutateAsync({ key: 'ticket_prefix', value: ticketPrefix }),
        updateAppSetting.mutateAsync({ key: 'ticket_separator', value: ticketSeparator }),
        updateAppSetting.mutateAsync({ key: 'ticket_digits', value: ticketDigits }),
        updateAppSetting.mutateAsync({ key: 'ticket_include_agency', value: ticketIncludeAgency.toString() }),
        updateAppSetting.mutateAsync({ key: 'ticket_include_year', value: ticketIncludeYear.toString() }),
        updateAppSetting.mutateAsync({ key: 'manifest_prefix', value: manifestPrefix }),
        updateAppSetting.mutateAsync({ key: 'manifest_separator', value: manifestSeparator }),
        updateAppSetting.mutateAsync({ key: 'manifest_digits', value: manifestDigits }),
        updateAppSetting.mutateAsync({ key: 'manifest_include_agency', value: manifestIncludeAgency.toString() }),
        updateAppSetting.mutateAsync({ key: 'manifest_include_date', value: manifestIncludeDate.toString() }),
      ]);
      toast.success('Configuration de numérotation enregistrée');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  // Generate preview for ticket numbering
  const getTicketPreview = () => {
    const parts: string[] = [];
    if (ticketIncludeAgency) parts.push('OUA');
    if (ticketIncludeYear) parts.push(new Date().getFullYear().toString());
    parts.push('0'.repeat(parseInt(ticketDigits) || 6).slice(0, -1) + '1');
    return ticketPrefix + ticketSeparator + parts.join(ticketSeparator);
  };

  // Generate preview for manifest numbering
  const getManifestPreview = () => {
    const parts: string[] = [];
    if (manifestIncludeAgency) parts.push('OUA');
    if (manifestIncludeDate) parts.push(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    parts.push('0'.repeat(parseInt(manifestDigits) || 5).slice(0, -1) + '1');
    return manifestPrefix + manifestSeparator + parts.join(manifestSeparator);
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

        {/* Numbering Configuration - Admin only */}
        {isAdmin && (
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '75ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Hash className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Numérotation des Documents</h2>
                <p className="text-sm text-muted-foreground">Configurez le format des numéros de tickets et manifestes</p>
              </div>
            </div>
            
            {settingsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Ticket Numbering */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">Numérotation des Tickets</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs">Préfixe</Label>
                      <Input
                        value={ticketPrefix}
                        onChange={(e) => setTicketPrefix(e.target.value.toUpperCase())}
                        placeholder="TKT"
                        maxLength={5}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Séparateur</Label>
                      <Select value={ticketSeparator} onValueChange={setTicketSeparator}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">Tiret (-)</SelectItem>
                          <SelectItem value="/">Slash (/)</SelectItem>
                          <SelectItem value=".">Point (.)</SelectItem>
                          <SelectItem value="">Aucun</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Nb. chiffres</Label>
                      <Select value={ticketDigits} onValueChange={setTicketDigits}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 chiffres</SelectItem>
                          <SelectItem value="5">5 chiffres</SelectItem>
                          <SelectItem value="6">6 chiffres</SelectItem>
                          <SelectItem value="7">7 chiffres</SelectItem>
                          <SelectItem value="8">8 chiffres</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={ticketIncludeAgency} 
                          onCheckedChange={setTicketIncludeAgency}
                          id="ticket-agency"
                        />
                        <Label htmlFor="ticket-agency" className="text-xs">Code agence</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={ticketIncludeYear} 
                          onCheckedChange={setTicketIncludeYear}
                          id="ticket-year"
                        />
                        <Label htmlFor="ticket-year" className="text-xs">Année</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">Aperçu:</p>
                    <p className="font-mono font-bold text-primary">{getTicketPreview()}</p>
                  </div>
                </div>

                {/* Manifest Numbering */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-secondary" />
                    <h3 className="font-medium">Numérotation des Manifestes</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs">Préfixe</Label>
                      <Input
                        value={manifestPrefix}
                        onChange={(e) => setManifestPrefix(e.target.value.toUpperCase())}
                        placeholder="MAN"
                        maxLength={5}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Séparateur</Label>
                      <Select value={manifestSeparator} onValueChange={setManifestSeparator}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">Tiret (-)</SelectItem>
                          <SelectItem value="/">Slash (/)</SelectItem>
                          <SelectItem value=".">Point (.)</SelectItem>
                          <SelectItem value="">Aucun</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Nb. chiffres</Label>
                      <Select value={manifestDigits} onValueChange={setManifestDigits}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 chiffres</SelectItem>
                          <SelectItem value="5">5 chiffres</SelectItem>
                          <SelectItem value="6">6 chiffres</SelectItem>
                          <SelectItem value="7">7 chiffres</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={manifestIncludeAgency} 
                          onCheckedChange={setManifestIncludeAgency}
                          id="manifest-agency"
                        />
                        <Label htmlFor="manifest-agency" className="text-xs">Code agence</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={manifestIncludeDate} 
                          onCheckedChange={setManifestIncludeDate}
                          id="manifest-date"
                        />
                        <Label htmlFor="manifest-date" className="text-xs">Date</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-2 bg-background rounded border">
                    <p className="text-xs text-muted-foreground">Aperçu:</p>
                    <p className="font-mono font-bold text-secondary">{getManifestPreview()}</p>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveNumberingSettings}
                  disabled={updateAppSetting.isPending}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer la configuration
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Cash Discrepancy Alert Settings - Admin only */}
        {isAdmin && (
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Alertes Écarts de Caisse</h2>
                <p className="text-sm text-muted-foreground">Configurez le seuil pour déclencher une alerte automatique</p>
              </div>
            </div>
            
            {settingsLoading ? (
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
                    disabled={updateAppSetting.isPending}
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
