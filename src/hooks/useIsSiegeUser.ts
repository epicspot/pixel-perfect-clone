import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns true when the current user is an admin OR is affected to the
 * Siège (head office, agency code = 'SIE'). Siège users have cross-agency
 * administrative access.
 */
export function useIsSiegeUser() {
  const { profile } = useAuth();

  const { data: agencyCode } = useQuery({
    queryKey: ['user-agency-code', profile?.agency_id],
    queryFn: async () => {
      if (!profile?.agency_id) return null;
      const { data } = await supabase
        .from('agencies')
        .select('code')
        .eq('id', profile.agency_id)
        .single();
      return data?.code ?? null;
    },
    enabled: !!profile?.agency_id,
    staleTime: 1000 * 60 * 10,
  });

  const isAdmin = profile?.role === 'admin';
  const isSiege = agencyCode === 'SIE';

  return {
    isAdmin,
    isSiege,
    hasSiegeAccess: isAdmin || isSiege,
    isLoading: !!profile?.agency_id && agencyCode === undefined,
  };
}
