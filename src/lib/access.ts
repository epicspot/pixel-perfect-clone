/**
 * Centralised access rules for the audit module.
 *
 * The audit log is strictly reserved for users assigned to the Siège agency
 * (code "SIE"), regardless of their functional role. This helper is the single
 * source of truth used by:
 *   - `ProtectedRoute` (route guard)
 *   - `Sidebar` (menu visibility)
 *   - `AuditLogs` (in-page fallback when accessed directly)
 *   - Unit tests
 */
export interface AuditAccessProfile {
  agency_code?: string | null;
}

export function canAccessAudit(profile: AuditAccessProfile | null | undefined): boolean {
  return profile?.agency_code === "SIE";
}
