import React from 'react';
import { useAllPermissions, moduleLabels, allModules, ModuleType, RolePermission } from '@/hooks/usePermissions';
import { roleLabels, UserRole } from '@/lib/permissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Eye, Plus, Pencil, Trash2 } from 'lucide-react';

const allRoles: UserRole[] = ['admin', 'manager', 'cashier', 'accountant', 'mechanic'];

export const PermissionsManager: React.FC = () => {
  const { allPermissions, isLoading, updatePermission } = useAllPermissions();

  const handlePermissionChange = async (
    permission: RolePermission,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    // Admin permissions cannot be modified
    if (permission.role === 'admin') {
      toast({
        title: 'Action non autorisée',
        description: 'Les permissions administrateur ne peuvent pas être modifiées.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updatePermission(permission.id, { [field]: value });
      toast({
        title: 'Permission mise à jour',
        description: `${moduleLabels[permission.module as ModuleType]} - ${roleLabels[permission.role as UserRole]}`,
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getPermissionForRoleModule = (role: string, module: string): RolePermission | undefined => {
    return allPermissions?.find(p => p.role === role && p.module === module);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Matrice des Permissions</h3>
          <p className="text-sm text-muted-foreground">
            Définissez les droits d'accès pour chaque rôle et module
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground border-b border-border sticky left-0 bg-muted/50 z-10">
                Module
              </th>
              {allRoles.map(role => (
                <th key={role} colSpan={4} className="text-center p-3 font-medium text-card-foreground border-b border-border border-l">
                  {roleLabels[role]}
                </th>
              ))}
            </tr>
            <tr className="bg-muted/30">
              <th className="p-2 border-b border-border sticky left-0 bg-muted/30 z-10"></th>
              {allRoles.map(role => (
                <React.Fragment key={`${role}-actions`}>
                  <th className="p-2 border-b border-border border-l" title="Voir">
                    <Eye className="w-4 h-4 mx-auto text-blue-500" />
                  </th>
                  <th className="p-2 border-b border-border" title="Créer">
                    <Plus className="w-4 h-4 mx-auto text-green-500" />
                  </th>
                  <th className="p-2 border-b border-border" title="Modifier">
                    <Pencil className="w-4 h-4 mx-auto text-orange-500" />
                  </th>
                  <th className="p-2 border-b border-border" title="Supprimer">
                    <Trash2 className="w-4 h-4 mx-auto text-red-500" />
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {allModules.map((module, index) => (
              <tr 
                key={module} 
                className={index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}
              >
                <td className={`p-3 font-medium text-card-foreground border-b border-border sticky left-0 z-10 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                  {moduleLabels[module]}
                </td>
                {allRoles.map(role => {
                  const permission = getPermissionForRoleModule(role, module);
                  const isAdmin = role === 'admin';
                  
                  return (
                    <React.Fragment key={`${role}-${module}`}>
                      <td className="p-2 text-center border-b border-border border-l">
                        <Checkbox
                          checked={permission?.can_view ?? false}
                          onCheckedChange={(checked) => 
                            permission && handlePermissionChange(permission, 'can_view', !!checked)
                          }
                          disabled={isAdmin}
                          className={isAdmin ? 'opacity-50' : ''}
                        />
                      </td>
                      <td className="p-2 text-center border-b border-border">
                        <Checkbox
                          checked={permission?.can_create ?? false}
                          onCheckedChange={(checked) => 
                            permission && handlePermissionChange(permission, 'can_create', !!checked)
                          }
                          disabled={isAdmin}
                          className={isAdmin ? 'opacity-50' : ''}
                        />
                      </td>
                      <td className="p-2 text-center border-b border-border">
                        <Checkbox
                          checked={permission?.can_edit ?? false}
                          onCheckedChange={(checked) => 
                            permission && handlePermissionChange(permission, 'can_edit', !!checked)
                          }
                          disabled={isAdmin}
                          className={isAdmin ? 'opacity-50' : ''}
                        />
                      </td>
                      <td className="p-2 text-center border-b border-border">
                        <Checkbox
                          checked={permission?.can_delete ?? false}
                          onCheckedChange={(checked) => 
                            permission && handlePermissionChange(permission, 'can_delete', !!checked)
                          }
                          disabled={isAdmin}
                          className={isAdmin ? 'opacity-50' : ''}
                        />
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-500" />
          <span>Voir</span>
        </div>
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-500" />
          <span>Créer</span>
        </div>
        <div className="flex items-center gap-2">
          <Pencil className="w-4 h-4 text-orange-500" />
          <span>Modifier</span>
        </div>
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-500" />
          <span>Supprimer</span>
        </div>
      </div>
    </div>
  );
};
