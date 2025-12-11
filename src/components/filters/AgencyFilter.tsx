import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';

interface AgencyFilterProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function AgencyFilter({ value, onChange, label = 'Agence', className }: AgencyFilterProps) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { data: agencies } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => api.getAgencies(),
    enabled: isAdmin,
  });

  // Non-admins don't see this filter
  if (!isAdmin) {
    return null;
  }

  return (
    <div className={className}>
      <Label className="text-xs flex items-center gap-1.5">
        <Building2 className="w-3 h-3" />
        {label}
      </Label>
      <Select 
        value={value || 'all'} 
        onValueChange={(val) => onChange(val === 'all' ? '' : val)}
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Toutes les agences" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les agences</SelectItem>
          {agencies?.map((a) => (
            <SelectItem key={a.id} value={a.id.toString()}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Hook to use agency filter with automatic admin detection
export function useAgencyFilter() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  
  return {
    isAdmin,
    userAgencyId: profile?.agency_id,
    // Returns the agency_id to use in queries - for admins, use selected filter; for others, use their agency
    getFilterAgencyId: (selectedAgencyId: string) => {
      if (isAdmin) {
        return selectedAgencyId ? Number(selectedAgencyId) : undefined;
      }
      return profile?.agency_id || undefined;
    },
  };
}
