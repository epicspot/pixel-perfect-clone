import { ShieldX, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel, UserRole, roleRoutePermissions } from "@/lib/permissions";

const AccessDenied = () => {
  const navigate = useNavigate();
  const { profile, isLoading } = useAuth();

  const handleRefreshAndRedirect = () => {
    // Get the first accessible route for the user's role
    const userRole = profile?.role as UserRole;
    if (userRole && roleRoutePermissions[userRole]) {
      const accessibleRoutes = roleRoutePermissions[userRole];
      // Navigate to the dashboard (/) if accessible, otherwise first available route
      const targetRoute = accessibleRoutes.includes('/') ? '/' : accessibleRoutes[0] || '/';
      navigate(targetRoute, { replace: true });
    } else {
      // Fallback to home
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
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
