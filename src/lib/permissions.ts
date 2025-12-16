// Role-based permissions configuration
export type UserRole = 'admin' | 'manager' | 'cashier' | 'accountant' | 'mechanic';

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

// Define which routes each role can access
export const roleRoutePermissions: Record<UserRole, string[]> = {
  admin: [
    '/',
    '/tickets',
    '/expeditions',
    '/expeditions/dashboard',
    '/controle-tickets',
    '/suivi-souches',
    '/voyages',
    '/guichets',
    '/cloture-caisse',
    '/carburant',
    '/maintenance',
    '/couts-vehicules',
    '/comptabilite',
    '/rapports',
    '/rapports/agence',
    '/rapports/caisse',
    '/rapports/lignes',
    '/rapports/expeditions',
    '/rapports/sessions',
    '/rapports/synthese',
    '/staff',
    '/depenses',
    '/paie',
    '/admin',
    '/audit',
    '/parametres',
  ],
  manager: [
    '/',
    '/tickets',
    '/expeditions',
    '/expeditions/dashboard',
    '/controle-tickets',
    '/suivi-souches',
    '/voyages',
    '/guichets',
    '/cloture-caisse',
    '/carburant',
    '/maintenance',
    '/rapports',
    '/rapports/agence',
    '/rapports/caisse',
    '/rapports/lignes',
    '/rapports/expeditions',
    '/rapports/sessions',
    '/rapports/synthese',
    '/staff',
    '/depenses',
    '/parametres',
  ],
  cashier: [
    '/',
    '/tickets',
    '/expeditions',
    '/controle-tickets',
    '/suivi-souches',
    '/voyages',
    '/guichets',
    '/cloture-caisse',
    '/parametres',
  ],
  accountant: [
    '/',
    '/rapports',
    '/rapports/agence',
    '/rapports/caisse',
    '/rapports/lignes',
    '/rapports/expeditions',
    '/rapports/sessions',
    '/rapports/synthese',
    '/comptabilite',
    '/depenses',
    '/paie',
    '/couts-vehicules',
    '/parametres',
  ],
  mechanic: [
    '/',
    '/carburant',
    '/maintenance',
    '/couts-vehicules',
    '/staff',
    '/depenses',
    '/parametres',
  ],
};

// Define role labels in French
export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  cashier: 'Guichetier',
  accountant: 'Comptable',
  mechanic: 'Mécanicien',
};

// Define role colors for badges
export const roleColors: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  manager: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  cashier: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  accountant: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  mechanic: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-400' },
};

// Check if a role has access to a specific route
export function hasRouteAccess(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;
  const allowedRoutes = roleRoutePermissions[role] || [];
  return allowedRoutes.some(r => route === r || route.startsWith(r + '/'));
}

// Get role label
export function getRoleLabel(role: UserRole | string): string {
  return roleLabels[role as UserRole] || role;
}

// Get role color classes
export function getRoleColorClasses(role: UserRole | string): string {
  const colors = roleColors[role as UserRole];
  if (colors) {
    return `${colors.bg} ${colors.text}`;
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}
