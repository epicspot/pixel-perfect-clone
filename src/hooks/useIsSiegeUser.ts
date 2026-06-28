import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns true when the current user is an admin OR is affected to the
 * Siège (head office, agency code = 'SIE'). Siège users have cross-agency
 * administrative access.
 */
export function useIsSiegeUser() {
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const isSiege = profile?.agency_code === 'SIE';

  return {
    isAdmin,
    isSiege,
    hasSiegeAccess: isAdmin || isSiege,
  };
}
