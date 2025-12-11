import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { LogOut, Bell, Building2 } from 'lucide-react';
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
      <main className="ml-64 pt-16 p-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
