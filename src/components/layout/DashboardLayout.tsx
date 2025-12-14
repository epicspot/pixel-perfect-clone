import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { LogOut, Bell, Building2, Bus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Top Header Bar */}
      <header className="fixed top-0 right-0 left-64 h-16 bg-card border-b border-border z-30 px-6 flex items-center justify-between transition-all duration-300">
        {/* Left side - can add breadcrumbs or title here */}
        <div className="flex items-center gap-3">
          {profile?.agency_name && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{profile.agency_name}</span>
            </div>
          )}
        </div>

        {/* Right side - User info */}
        <div className="flex items-center gap-4">
          {/* Notifications placeholder */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center shadow-sm">
                  {profile?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-medium text-foreground">
                    {profile?.name ?? 'Utilisateur'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {getRoleLabel(profile?.role || '')}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/parametres')}>
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content with top padding for header */}
      <main className="ml-64 pt-16 p-8 pb-20 transition-all duration-300">
        {children}
      </main>

      {/* Animated Footer */}
      <footer className="fixed bottom-0 right-0 left-64 h-12 bg-card/80 backdrop-blur-sm border-t border-border z-30 flex items-center justify-center overflow-hidden">
        <div className="flex items-center gap-3 animate-footer-slide">
          {/* Animated Bus */}
          <div className="relative">
            <Bus className="w-5 h-5 text-primary animate-bus-drive" />
            {/* Exhaust smoke effect */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30 animate-smoke-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 animate-smoke-2" />
              <span className="w-1 h-1 rounded-full bg-muted-foreground/10 animate-smoke-3" />
            </div>
          </div>
          
          {/* Copyright */}
          <span className="text-xs text-muted-foreground font-medium">
            © EPICSPOT CONSULTING 2025 — Tous droits réservés
          </span>
        </div>
      </footer>

      <style>{`
        @keyframes bus-drive {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(2px) rotate(-1deg); }
          50% { transform: translateX(0) rotate(0deg); }
          75% { transform: translateX(-2px) rotate(1deg); }
        }
        @keyframes smoke-1 {
          0%, 100% { opacity: 0.3; transform: translateX(0) scale(1); }
          50% { opacity: 0; transform: translateX(-8px) scale(1.5); }
        }
        @keyframes smoke-2 {
          0%, 100% { opacity: 0.2; transform: translateX(0) scale(1); }
          50% { opacity: 0; transform: translateX(-12px) scale(1.8); }
        }
        @keyframes smoke-3 {
          0%, 100% { opacity: 0.1; transform: translateX(0) scale(1); }
          50% { opacity: 0; transform: translateX(-16px) scale(2); }
        }
        .animate-bus-drive {
          animation: bus-drive 1s ease-in-out infinite;
        }
        .animate-smoke-1 {
          animation: smoke-1 1.5s ease-out infinite;
        }
        .animate-smoke-2 {
          animation: smoke-2 1.5s ease-out infinite 0.2s;
        }
        .animate-smoke-3 {
          animation: smoke-3 1.5s ease-out infinite 0.4s;
        }
      `}</style>
    </div>
  );
}
