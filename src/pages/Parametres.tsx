import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Server, Bell, Shield, Package, Save, Building2, Upload, X, Image, AlertTriangle, Hash, FileText, Key, Smartphone, LogOut, Loader2, Eye, EyeOff, QrCode, Copy, Check, UserX, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

const shipmentTypeIcons: Record<string, string> = {
  excess_baggage: '🧳',
  unaccompanied_baggage: '📦',
  parcel: '📬',
  express: '⚡',
};

const shipmentTypeDescriptions: Record<string, string> = {
  excess_baggage: 'Bagages supplémentaires voyageant avec un passager',
  unaccompanied_baggage: 'Bagages envoyés sans passager associé',
  parcel: 'Colis et paquets standards',
  express: 'Envoi prioritaire avec livraison rapide',
};

const Parametres = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = profile?.role === 'admin';
  const [editedPricing, setEditedPricing] = useState<Record<string, { base_price: string; price_per_kg: string; description: string; is_active: boolean }>>({});
  const [previewWeight, setPreviewWeight] = useState('5');
  const [companyName, setCompanyName] = useState('');
  const [companySlogan, setCompanySlogan] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyRccm, setCompanyRccm] = useState('');
  const [companyIfu, setCompanyIfu] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [discrepancyThreshold, setDiscrepancyThreshold] = useState('5000');
  const [payrollVariationThreshold, setPayrollVariationThreshold] = useState('10');
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
  const [showMarqueeBanner, setShowMarqueeBanner] = useState(true);
  const [marqueeSpeed, setMarqueeSpeed] = useState('30');
  const [marqueeColorFrom, setMarqueeColorFrom] = useState('#059669');
  const [marqueeColorTo, setMarqueeColorTo] = useState('#14b8a6');
  const [marqueeCustomText, setMarqueeCustomText] = useState('');

  // Security state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [mfaSetupStep, setMfaSetupStep] = useState<'info' | 'qr' | 'verify'>('info');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Admin logout user state
  const [adminLogoutDialogOpen, setAdminLogoutDialogOpen] = useState(false);
  const [selectedUserToLogout, setSelectedUserToLogout] = useState<string | null>(null);
  const [adminLoggingOut, setAdminLoggingOut] = useState(false);

  // Fetch users for admin
  const { data: users } = useQuery({
    queryKey: ['users-for-logout'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .neq('id', profile?.id || '')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Check MFA status on mount
  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) {
          console.error('Error checking MFA status:', error);
          return;
        }
        const verifiedFactors = data.totp.filter(f => f.status === 'verified');
        setMfaEnabled(verifiedFactors.length > 0);
      } catch (err) {
        console.error('Error checking MFA:', err);
      }
    };
    checkMfaStatus();
  }, []);

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
      setCompanyRccm(companySettings.rccm || '');
      setCompanyIfu(companySettings.ifu || '');
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
      setPayrollVariationThreshold(findSetting('payroll_variation_threshold') || '10');
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
      setShowMarqueeBanner(findSetting('show_marquee_banner') !== 'false');
      setMarqueeSpeed(findSetting('marquee_speed') || '30');
      setMarqueeColorFrom(findSetting('marquee_color_from') || '#059669');
      setMarqueeColorTo(findSetting('marquee_color_to') || '#14b8a6');
      setMarqueeCustomText(findSetting('marquee_custom_text') || '');
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
      const initial: Record<string, { base_price: string; price_per_kg: string; description: string; is_active: boolean }> = {};
      pricing.forEach(p => {
        initial[p.type] = {
          base_price: p.base_price.toString(),
          price_per_kg: p.price_per_kg.toString(),
          description: p.description || '',
          is_active: p.is_active,
        };
      });
      setEditedPricing(initial);
    }
  }, [pricing]);

  // Update pricing mutation
  const updatePricing = useMutation({
    mutationFn: async ({ type, base_price, price_per_kg, description, is_active }: { type: string; base_price: number; price_per_kg: number; description: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('shipment_pricing')
        .update({ base_price, price_per_kg, description, is_active })
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
    mutationFn: async ({ company_name, slogan, address, phone, email, rccm, ifu }: { company_name: string; slogan: string; address: string; phone: string; email: string; rccm: string; ifu: string }) => {
      const { error } = await supabase
        .from('company_settings')
        .update({ company_name, slogan, address, phone, email, rccm, ifu })
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
    const sep = ticketSeparator === 'none' ? '' : ticketSeparator;
    const parts: string[] = [];
    if (ticketIncludeAgency) parts.push('OUA');
    if (ticketIncludeYear) parts.push(new Date().getFullYear().toString());
    parts.push('0'.repeat(parseInt(ticketDigits) || 6).slice(0, -1) + '1');
    return ticketPrefix + sep + parts.join(sep);
  };

  // Generate preview for manifest numbering
  const getManifestPreview = () => {
    const sep = manifestSeparator === 'none' ? '' : manifestSeparator;
    const parts: string[] = [];
    if (manifestIncludeAgency) parts.push('OUA');
    if (manifestIncludeDate) parts.push(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
    parts.push('0'.repeat(parseInt(manifestDigits) || 5).slice(0, -1) + '1');
    return manifestPrefix + sep + parts.join(sep);
  };

  // Security handlers
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast.success('Mot de passe modifié avec succès');
      setPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleStartMfaSetup = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      
      setMfaFactorId(data.id);
      setMfaQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setMfaSetupStep('qr');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la configuration 2FA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || !mfaCode || mfaCode.length !== 6) {
      toast.error('Veuillez entrer un code à 6 chiffres');
      return;
    }

    setMfaLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      toast.success('Authentification à deux facteurs activée');
      setMfaEnabled(true);
      setMfaDialogOpen(false);
      resetMfaState();
    } catch (error: any) {
      toast.error(error.message || 'Code invalide');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    setMfaLoading(true);
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const verifiedFactors = factors.totp.filter(f => f.status === 'verified');
      for (const factor of verifiedFactors) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (error) throw error;
      }

      toast.success('Authentification à deux facteurs désactivée');
      setMfaEnabled(false);
      setMfaDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la désactivation');
    } finally {
      setMfaLoading(false);
    }
  };

  const resetMfaState = () => {
    setMfaSetupStep('info');
    setMfaFactorId(null);
    setMfaQrCode(null);
    setMfaSecret(null);
    setMfaCode('');
  };

  const handleCopySecret = () => {
    if (mfaSecret) {
      navigator.clipboard.writeText(mfaSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleLogoutAllSessions = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success('Toutes les sessions ont été déconnectées');
      // Redirect will happen automatically due to auth state change
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la déconnexion');
      setLoggingOut(false);
    }
  };

  const handleAdminLogoutUser = async () => {
    if (!selectedUserToLogout) return;
    
    setAdminLoggingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-logout-user', {
        body: { userId: selectedUserToLogout }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('L\'utilisateur a été déconnecté de toutes ses sessions');
      setAdminLogoutDialogOpen(false);
      setSelectedUserToLogout(null);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la déconnexion de l\'utilisateur');
    } finally {
      setAdminLoggingOut(false);
    }
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
      rccm: companyRccm.trim(),
      ifu: companyIfu.trim(),
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
      description: edited.description,
      is_active: edited.is_active,
    });
  };

  const handlePricingChange = (type: string, field: 'base_price' | 'price_per_kg' | 'description' | 'is_active', value: string | boolean) => {
    setEditedPricing(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const calculatePrice = (type: string, weight: number) => {
    const edited = editedPricing[type];
    if (!edited) return 0;
    return (parseFloat(edited.base_price) || 0) + (parseFloat(edited.price_per_kg) || 0) * weight;
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

                {/* RCCM & IFU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-rccm">N° RCCM</Label>
                    <Input
                      id="company-rccm"
                      value={companyRccm}
                      onChange={(e) => setCompanyRccm(e.target.value)}
                      placeholder="Ex: BF-OUA-2020-B-12345"
                      className="mt-1"
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Registre du Commerce et du Crédit Mobilier
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="company-ifu">N° IFU</Label>
                    <Input
                      id="company-ifu"
                      value={companyIfu}
                      onChange={(e) => setCompanyIfu(e.target.value)}
                      placeholder="Ex: 00012345A"
                      className="mt-1"
                      maxLength={30}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Identifiant Fiscal Unique
                    </p>
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
              <div className="space-y-6">
                {/* Preview Calculator */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium">🧮 Simulateur de prix</span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Poids test:</Label>
                      <Input
                        type="number"
                        value={previewWeight}
                        onChange={(e) => setPreviewWeight(e.target.value)}
                        className="w-20 h-8"
                        min="0"
                        step="0.5"
                      />
                      <span className="text-xs text-muted-foreground">kg</span>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {pricing?.filter(p => editedPricing[p.type]?.is_active !== false).map((item) => (
                        <div key={item.type} className="text-xs bg-background px-2 py-1 rounded border">
                          <span className="text-muted-foreground">{shipmentTypeIcons[item.type]}</span>
                          <span className="ml-1 font-medium">
                            {calculatePrice(item.type, parseFloat(previewWeight) || 0).toLocaleString()} F
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  {pricing?.map((item) => (
                    <div 
                      key={item.id} 
                      className={`p-4 rounded-lg border transition-all ${
                        editedPricing[item.type]?.is_active !== false
                          ? 'bg-background border-border shadow-sm'
                          : 'bg-muted/30 border-border/50 opacity-60'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{shipmentTypeIcons[item.type]}</span>
                          <div>
                            <h3 className="font-medium">{shipmentTypeLabels[item.type] || item.type}</h3>
                            <p className="text-xs text-muted-foreground">
                              {shipmentTypeDescriptions[item.type]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${item.type}`} className="text-xs text-muted-foreground">
                            {editedPricing[item.type]?.is_active !== false ? 'Actif' : 'Inactif'}
                          </Label>
                          <Switch
                            id={`active-${item.type}`}
                            checked={editedPricing[item.type]?.is_active !== false}
                            onCheckedChange={(checked) => handlePricingChange(item.type, 'is_active', checked)}
                          />
                        </div>
                      </div>

                      {/* Pricing Inputs */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Frais de base</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={editedPricing[item.type]?.base_price || ''}
                              onChange={(e) => handlePricingChange(item.type, 'base_price', e.target.value)}
                              className="mt-1 pr-8"
                              min="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 text-xs text-muted-foreground">F</span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Prix par kg</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={editedPricing[item.type]?.price_per_kg || ''}
                              onChange={(e) => handlePricingChange(item.type, 'price_per_kg', e.target.value)}
                              className="mt-1 pr-12"
                              min="0"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 text-xs text-muted-foreground">F/kg</span>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="mb-3">
                        <Label className="text-xs text-muted-foreground">Description personnalisée</Label>
                        <Input
                          value={editedPricing[item.type]?.description || ''}
                          onChange={(e) => handlePricingChange(item.type, 'description', e.target.value)}
                          placeholder="Description optionnelle..."
                          className="mt-1 text-sm"
                        />
                      </div>

                      {/* Price Preview & Save */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Formule: </span>
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                            {editedPricing[item.type]?.base_price || '0'} + ({editedPricing[item.type]?.price_per_kg || '0'} × poids)
                          </span>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleSavePricing(item.type)}
                          disabled={updatePricing.isPending}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
                          <SelectItem value="none">Aucun</SelectItem>
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
                          <SelectItem value="none">Aucun</SelectItem>
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

        {/* Payroll Variation Alert Settings - Admin only */}
        {isAdmin && (
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '125ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Alertes Variation Paie</h2>
                <p className="text-sm text-muted-foreground">Configurez le seuil pour déclencher une alerte sur la masse salariale</p>
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
                    <Label htmlFor="payroll-threshold">Seuil d'alerte (%)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Une alerte sera affichée si la variation de la masse salariale dépasse ce pourcentage
                    </p>
                    <Input
                      id="payroll-threshold"
                      type="number"
                      value={payrollVariationThreshold}
                      onChange={(e) => setPayrollVariationThreshold(e.target.value)}
                      placeholder="10"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      const value = parseInt(payrollVariationThreshold);
                      if (isNaN(value) || value < 0 || value > 100) {
                        toast.error('Veuillez entrer un pourcentage valide (0-100)');
                        return;
                      }
                      updateAppSetting.mutate({ key: 'payroll_variation_threshold', value: value.toString() });
                    }}
                    disabled={updateAppSetting.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dans le module Paie, une alerte sera affichée lors du comparatif N vs N-1 si la variation dépasse ce seuil.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Display Settings - Admin only */}
        {isAdmin && (
          <Card className="p-6 animate-slide-up" style={{ animationDelay: '130ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Affichage Tableau de Bord</h2>
                <p className="text-sm text-muted-foreground">Personnalisez l'affichage du tableau de bord</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Bande défilante</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Afficher la bande défilante avec le nom et slogan de la compagnie sur le tableau de bord
                  </p>
                </div>
                <Switch
                  checked={showMarqueeBanner}
                  onCheckedChange={(checked) => {
                    setShowMarqueeBanner(checked);
                    updateAppSetting.mutate({ 
                      key: 'show_marquee_banner', 
                      value: checked.toString() 
                    });
                  }}
                />
              </div>

              {showMarqueeBanner && (
                <>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div>
                      <Label>Vitesse de défilement</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Ajustez la vitesse de défilement de la bande (10 = rapide, 60 = lent)
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">Rapide</span>
                        <input
                          type="range"
                          min="10"
                          max="60"
                          value={marqueeSpeed}
                          onChange={(e) => setMarqueeSpeed(e.target.value)}
                          className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-xs text-muted-foreground">Lent</span>
                        <span className="text-sm font-medium w-10 text-center">{marqueeSpeed}s</span>
                        <Button
                          size="sm"
                          onClick={() => updateAppSetting.mutate({ key: 'marquee_speed', value: marqueeSpeed })}
                          disabled={updateAppSetting.isPending}
                        >
                          <Save className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div>
                      <Label>Couleurs de la bande</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Choisissez un thème prédéfini ou personnalisez les couleurs
                      </p>
                      
                      {/* Color Presets */}
                      <div className="mb-4">
                        <Label className="text-xs mb-2 block">Thèmes prédéfinis</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: 'Émeraude', from: '#059669', to: '#14b8a6' },
                            { name: 'Océan', from: '#0284c7', to: '#06b6d4' },
                            { name: 'Violet', from: '#7c3aed', to: '#a855f7' },
                            { name: 'Rose', from: '#db2777', to: '#f472b6' },
                            { name: 'Soleil', from: '#d97706', to: '#fbbf24' },
                            { name: 'Forêt', from: '#166534', to: '#22c55e' },
                            { name: 'Nuit', from: '#1e293b', to: '#475569' },
                            { name: 'Feu', from: '#dc2626', to: '#f97316' },
                          ].map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => {
                                setMarqueeColorFrom(preset.from);
                                setMarqueeColorTo(preset.to);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:scale-105 hover:shadow-md ${
                                marqueeColorFrom === preset.from && marqueeColorTo === preset.to 
                                  ? 'ring-2 ring-primary ring-offset-2' 
                                  : ''
                              }`}
                              style={{ background: `linear-gradient(to right, ${preset.from}, ${preset.to})` }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Colors */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Début:</Label>
                          <input
                            type="color"
                            value={marqueeColorFrom}
                            onChange={(e) => setMarqueeColorFrom(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Fin:</Label>
                          <input
                            type="color"
                            value={marqueeColorTo}
                            onChange={(e) => setMarqueeColorTo(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                          />
                        </div>
                        <div 
                          className="flex-1 h-8 rounded-lg min-w-[100px]"
                          style={{ background: `linear-gradient(to right, ${marqueeColorFrom}, ${marqueeColorTo})` }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            updateAppSetting.mutate({ key: 'marquee_color_from', value: marqueeColorFrom });
                            updateAppSetting.mutate({ key: 'marquee_color_to', value: marqueeColorTo });
                          }}
                          disabled={updateAppSetting.isPending}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div>
                      <Label>Texte personnalisé</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Remplacer le slogan par un texte personnalisé (laissez vide pour utiliser le slogan)
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={marqueeCustomText}
                          onChange={(e) => setMarqueeCustomText(e.target.value)}
                          placeholder="Ex: Promotion spéciale - 20% de réduction sur tous les voyages !"
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => updateAppSetting.mutate({ key: 'marquee_custom_text', value: marqueeCustomText })}
                          disabled={updateAppSetting.isPending}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
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
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <Key className="w-4 h-4" />
              Changer le mot de passe
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                resetMfaState();
                setMfaDialogOpen(true);
              }}
            >
              <Smartphone className="w-4 h-4" />
              {mfaEnabled ? 'Gérer l\'authentification à deux facteurs' : 'Activer l\'authentification à deux facteurs'}
              {mfaEnabled && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Activé
                </span>
              )}
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="w-4 h-4" />
              Déconnecter toutes mes sessions
            </Button>

            {isAdmin && (
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => setAdminLogoutDialogOpen(true)}
              >
                <UserX className="w-4 h-4" />
                Déconnecter un utilisateur
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>
              Entrez votre nouveau mot de passe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <Alert variant="destructive">
                <AlertDescription>Les mots de passe ne correspondent pas</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
            >
              {changingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Changer le mot de passe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Dialog */}
      <Dialog open={mfaDialogOpen} onOpenChange={(open) => {
        setMfaDialogOpen(open);
        if (!open) resetMfaState();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mfaEnabled ? 'Authentification à deux facteurs' : 'Activer la 2FA'}
            </DialogTitle>
            <DialogDescription>
              {mfaEnabled 
                ? 'Votre compte est protégé par l\'authentification à deux facteurs'
                : 'Sécurisez votre compte avec une application d\'authentification'
              }
            </DialogDescription>
          </DialogHeader>

          {mfaEnabled ? (
            <div className="space-y-4 py-4">
              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <Check className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  L'authentification à deux facteurs est activée sur votre compte.
                </AlertDescription>
              </Alert>
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleDisableMfa}
                disabled={mfaLoading}
              >
                {mfaLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Désactiver la 2FA
              </Button>
            </div>
          ) : (
            <>
              {mfaSetupStep === 'info' && (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte.
                    Vous aurez besoin d'une application d'authentification comme Google Authenticator ou Authy.
                  </p>
                  <Button onClick={handleStartMfaSetup} disabled={mfaLoading} className="w-full">
                    {mfaLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Commencer la configuration
                  </Button>
                </div>
              )}

              {mfaSetupStep === 'qr' && mfaQrCode && (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    1. Scannez ce QR code avec votre application d'authentification
                  </p>
                  <div className="flex justify-center">
                    <img src={mfaQrCode} alt="QR Code" className="w-48 h-48 rounded-lg border" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Ou entrez ce code manuellement :
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="px-3 py-2 bg-muted rounded font-mono text-sm">
                        {mfaSecret}
                      </code>
                      <Button variant="ghost" size="sm" onClick={handleCopySecret}>
                        {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button onClick={() => setMfaSetupStep('verify')} className="w-full">
                    J'ai scanné le code
                  </Button>
                </div>
              )}

              {mfaSetupStep === 'verify' && (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    2. Entrez le code à 6 chiffres affiché dans votre application
                  </p>
                  <Input
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                  />
                  <Button 
                    onClick={handleVerifyMfa} 
                    disabled={mfaLoading || mfaCode.length !== 6}
                    className="w-full"
                  >
                    {mfaLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Vérifier et activer
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setMfaSetupStep('qr')}
                    className="w-full"
                  >
                    Retour au QR code
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Logout All Sessions Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Déconnecter toutes les sessions</DialogTitle>
            <DialogDescription>
              Cette action déconnectera toutes vos sessions actives, y compris celle-ci.
              Vous devrez vous reconnecter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleLogoutAllSessions}
              disabled={loggingOut}
            >
              {loggingOut && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Déconnecter toutes les sessions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Logout User Dialog */}
      <Dialog open={adminLogoutDialogOpen} onOpenChange={(open) => {
        setAdminLogoutDialogOpen(open);
        if (!open) setSelectedUserToLogout(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Déconnecter un utilisateur</DialogTitle>
            <DialogDescription>
              Sélectionnez l'utilisateur dont vous souhaitez fermer toutes les sessions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="user-select">Utilisateur</Label>
            <Select value={selectedUserToLogout || ''} onValueChange={setSelectedUserToLogout}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{user.name}</span>
                      <span className="text-muted-foreground text-xs">({user.email})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUserToLogout && (
              <Alert className="mt-4">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Cette action déconnectera immédiatement l'utilisateur de toutes ses sessions actives.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAdminLogoutDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleAdminLogoutUser}
              disabled={adminLoggingOut || !selectedUserToLogout}
            >
              {adminLoggingOut && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Déconnecter l'utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Parametres;
