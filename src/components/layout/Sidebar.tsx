import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Ticket, 
  Bus, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Shield,
  Wrench,
  Fuel,
  Users,
  Receipt,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { hasRouteAccess, getRoleLabel, UserRole } from '@/lib/permissions';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/voyages', icon: Bus, label: 'Voyages' },
  { to: '/cloture-caisse', icon: Wallet, label: 'Clôture caisse' },
  { to: '/carburant', icon: Fuel, label: 'Carburant' },
  { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
  { to: '/couts-vehicules', icon: BarChart3, label: 'Coûts véhicules' },
  { to: '/rapports', icon: BarChart3, label: 'Rapports' },
  { to: '/staff', icon: Users, label: 'Personnel' },
  { to: '/depenses', icon: Receipt, label: 'Dépenses' },
  { to: '/paie', icon: Wallet, label: 'Paie' },
  { to: '/admin', icon: Shield, label: 'Administration' },
  { to: '/parametres', icon: Settings, label: 'Paramètres' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, profile } = useAuth();
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
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Bus className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sidebar-foreground text-lg">EPICSPOT</h1>
              <p className="text-xs text-sidebar-foreground/60">Trans Manager</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center mx-auto shadow-glow">
            <Bus className="w-6 h-6 text-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent absolute -right-3 top-6 bg-sidebar border border-sidebar-border rounded-full w-6 h-6 p-0"
        >
          {collapsed ? <Menu className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </Button>
      </div>

      {/* User info */}
      {!collapsed && profile && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.name}</p>
          <p className="text-xs text-sidebar-foreground/60">{getRoleLabel(profile.role)}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems
          .filter((item) => hasRouteAccess(profile?.role as UserRole, item.to))
          .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
              "hover:bg-sidebar-accent group",
              isActive 
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow" 
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
            {!collapsed && (
              <span className="font-medium animate-fade-in">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full",
            "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
          )}
        >
          <LogOut className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="font-medium">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
