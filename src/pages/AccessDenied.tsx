import { ShieldX, ArrowLeft, Home, RefreshCw, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel, UserRole, roleRoutePermissions } from "@/lib/permissions";

// Labels for routes in French
const routeLabels: Record<string, string> = {
  '/': 'Tableau de bord',
  '/tickets': 'Billetterie',
  '/expeditions': 'Expéditions',
  '/voyages': 'Voyages',
  '/depenses': 'Dépenses',
  '/carburant': 'Carburant',
  '/maintenance': 'Maintenance',
  '/staff': 'Personnel',
  '/paie': 'Paie',
  '/guichets': 'Guichets',
  '/cloture-caisse': 'Clôture de caisse',
  '/rapports': 'Rapports',
  '/rapports/agence': 'Rapport agence',
  '/rapports/trajets': 'Rapport trajets',
  '/rapports/caisse': 'Rapport caisse',
  '/rapports/expeditions': 'Rapport expéditions',
  '/rapports/sessions': 'Sessions de caisse',
  '/comptabilite': 'Comptabilité',
  '/admin': 'Administration',
  '/audit-logs': 'Journaux d\'audit',
  '/parametres': 'Paramètres',
  '/suivi-souches': 'Suivi souches',
  '/scan': 'Scanner tickets',
  '/cout-vehicules': 'Coûts véhicules',
  '/expeditions-dashboard': 'Dashboard expéditions',
};

const AccessDenied = () => {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();

  const userRole = profile?.role as UserRole;
  const accessibleRoutes = userRole && roleRoutePermissions[userRole] ? roleRoutePermissions[userRole] : [];

  const handleRefreshAndRedirect = () => {
    if (accessibleRoutes.length > 0) {
      const targetRoute = accessibleRoutes.includes('/') ? '/' : accessibleRoutes[0];
      navigate(targetRoute, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <ShieldX className="h-16 w-16 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Accès Refusé</h1>
          <p className="text-muted-foreground">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          {profile?.role && (
            <p className="text-sm text-muted-foreground">
              Votre rôle actuel : <span className="font-medium text-foreground">{getRoleLabel(profile.role as UserRole)}</span>
            </p>
          )}
        </div>

        {/* Accessible modules section */}
        {accessibleRoutes.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Modules accessibles :</h2>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
              {accessibleRoutes.slice(0, 10).map((route) => (
                <Link
                  key={route}
                  to={route}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                  {routeLabels[route] || route}
                </Link>
              ))}
              {accessibleRoutes.length > 10 && (
                <p className="text-xs text-muted-foreground px-3 py-1">
                  +{accessibleRoutes.length - 10} autres modules...
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button onClick={handleRefreshAndRedirect} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Réessayer
          </Button>
          <Button variant="secondary" onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Accueil
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;
