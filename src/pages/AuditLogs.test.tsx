/**
 * Verifies the in-page gating of `/audit`:
 * - A non-Siège user sees the "Accès réservé" fallback and triggers NO query
 *   against `audit_logs` (so no event from another agency can ever leak).
 * - A Siège user gets through the gate and the audit_logs query is issued.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ---- Mocks ----------------------------------------------------------------

const useAuthMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

// Render layout as a transparent wrapper to avoid pulling the full shell.
vi.mock("@/components/layout/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock("@/components/filters/AgencyFilter", () => ({
  AgencyFilter: () => <div data-testid="agency-filter" />,
}));

// Spyable Supabase client. We must observe whether `audit_logs` is queried.
const auditQueryCalls: string[] = [];
const buildChain = (table: string) => {
  const chain: any = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => {
      auditQueryCalls.push(table);
      return Promise.resolve({ data: [], error: null });
    }),
    eq: vi.fn(() => chain),
    in: vi.fn(() => Promise.resolve({ data: [], error: null })),
  };
  return chain;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => buildChain(table)),
  },
}));

// ---- Helpers --------------------------------------------------------------

async function renderPage() {
  // Import after mocks are registered.
  const { default: AuditLogs } = await import("./AuditLogs");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuditLogs />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auditQueryCalls.length = 0;
  useAuthMock.mockReset();
});

// ---- Tests ----------------------------------------------------------------

describe("AuditLogs - in-page access control", () => {
  it("bloque l'utilisateur d'une autre agence et n'interroge PAS audit_logs", async () => {
    useAuthMock.mockReturnValue({
      profile: { id: "u1", role: "admin", agency_code: "OUA" },
    });

    await renderPage();

    expect(
      screen.getByText("Accès réservé aux utilisateurs du Siège."),
    ).toBeInTheDocument();
    // Le titre du journal n'est jamais rendu pour un utilisateur non-Siège.
    expect(screen.queryByText(/Journal d'Audit/i)).not.toBeInTheDocument();
    // Aucune requête sur audit_logs : aucun événement ne peut fuiter.
    expect(auditQueryCalls).not.toContain("audit_logs");
  });

  it("bloque un utilisateur sans agence assignée", async () => {
    useAuthMock.mockReturnValue({
      profile: { id: "u2", role: "manager", agency_code: null },
    });

    await renderPage();

    expect(
      screen.getByText("Accès réservé aux utilisateurs du Siège."),
    ).toBeInTheDocument();
    expect(auditQueryCalls).not.toContain("audit_logs");
  });

  it("bloque un caissier d'une agence régionale", async () => {
    useAuthMock.mockReturnValue({
      profile: { id: "u3", role: "cashier", agency_code: "BOB" },
    });

    await renderPage();

    expect(
      screen.getByText("Accès réservé aux utilisateurs du Siège."),
    ).toBeInTheDocument();
    expect(auditQueryCalls).not.toContain("audit_logs");
  });

  it("laisse passer un utilisateur du Siège et déclenche la requête audit_logs", async () => {
    useAuthMock.mockReturnValue({
      profile: { id: "u4", role: "manager", agency_code: "SIE" },
    });

    await renderPage();

    // Le titre est visible côté Siège.
    expect(screen.getByText(/Journal d'Audit/i)).toBeInTheDocument();
    // Et la requête a bien été émise.
    expect(auditQueryCalls).toContain("audit_logs");
  });
});
