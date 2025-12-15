import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type ModuleType = 
  | 'tickets' 
  | 'expeditions' 
  | 'voyages' 
  | 'depenses' 
  | 'carburant' 
  | 'maintenance' 
  | 'staff' 
  | 'paie' 
  | 'guichets' 
  | 'rapports' 
  | 'comptabilite';

export interface Permission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface RolePermission {
  id: number;
  role: string;
  module: ModuleType;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// Module labels in French
export const moduleLabels: Record<ModuleType, string> = {
  tickets: 'Billetterie',
  expeditions: 'Expéditions',
  voyages: 'Voyages',
  depenses: 'Dépenses',
  carburant: 'Carburant',
  maintenance: 'Maintenance',
  staff: 'Personnel',
  paie: 'Paie',
  guichets: 'Guichets',
  rapports: 'Rapports',
  comptabilite: 'Comptabilité',
};

// All available modules
export const allModules: ModuleType[] = [
  'tickets',
  'expeditions',
  'voyages',
  'depenses',
  'carburant',
  'maintenance',
  'staff',
  'paie',
  'guichets',
  'rapports',
  'comptabilite',
];

// Default permission (no access)
const defaultPermission: Permission = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
};

export function usePermissions() {
  const { profile } = useAuth();
  const userRole = profile?.role;

  const { data: permissions, isLoading, refetch } = useQuery({
    queryKey: ['role-permissions', userRole],
    queryFn: async () => {
      if (!userRole) return [];
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', userRole);
      
      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }
      
      return data as RolePermission[];
    },
    enabled: !!userRole,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const getPermission = (module: ModuleType): Permission => {
    if (!permissions) return defaultPermission;
    
    const modulePermission = permissions.find(p => p.module === module);
    if (!modulePermission) return defaultPermission;
    
    return {
      can_view: modulePermission.can_view,
      can_create: modulePermission.can_create,
      can_edit: modulePermission.can_edit,
      can_delete: modulePermission.can_delete,
    };
  };

  const canView = (module: ModuleType): boolean => getPermission(module).can_view;
  const canCreate = (module: ModuleType): boolean => getPermission(module).can_create;
  const canEdit = (module: ModuleType): boolean => getPermission(module).can_edit;
  const canDelete = (module: ModuleType): boolean => getPermission(module).can_delete;

  return {
    permissions,
    isLoading,
    refetch,
    getPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    userRole,
  };
}

// Hook for admin to manage all permissions
export function useAllPermissions() {
  const { data: allPermissions, isLoading, refetch } = useQuery({
    queryKey: ['all-role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role')
        .order('module');
      
      if (error) {
        console.error('Error fetching all permissions:', error);
        return [];
      }
      
      return data as RolePermission[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const updatePermission = async (
    id: number, 
    updates: Partial<Pick<RolePermission, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>>
  ) => {
    const { error } = await supabase
      .from('role_permissions')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    await refetch();
  };

  return {
    allPermissions,
    isLoading,
    refetch,
    updatePermission,
  };
}
