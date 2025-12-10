import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Server, Bell, Shield, Palette } from 'lucide-react';

const Parametres = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-display font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Configurez votre application</p>
        </div>

        {/* API Configuration */}
        <Card className="p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Configuration API</h2>
              <p className="text-sm text-muted-foreground">Connectez votre API Laravel</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">URL de l'API</Label>
              <Input 
                id="api-url"
                placeholder="https://api.votredomaine.com"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">Clé API</Label>
              <Input 
                id="api-key"
                type="password"
                placeholder="Votre clé API secrète"
                className="bg-background"
              />
            </div>
            <Button className="gradient-primary text-primary-foreground">
              Tester la connexion
            </Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
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
        <Card className="p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
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
