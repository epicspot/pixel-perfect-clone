import { readFileSync } from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";

/**
 * Helpers e2e : simulent une session authentifiée côté navigateur et
 * interceptent tous les appels au backend, afin de tester les règles d'accès
 * du journal d'audit sans dépendre de données réelles.
 */

function readEnv(name: string, fallback: string): string {
  if (process.env[name]) return String(process.env[name]);
  try {
    const file = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    for (const line of file.split("\n")) {
      const m = line.match(new RegExp(`^${name}\\s*=\\s*(.*)$`));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Pas de fichier .env (ex. CI) : on retombe sur la valeur par défaut.
  }
  return fallback;
}

const SUPABASE_URL = readEnv(
  "VITE_SUPABASE_URL",
  "https://e2e-local.supabase.co",
);
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];
export const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

export interface FakeUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "cashier" | "accountant" | "mechanic";
  agencyId: number;
  agencyName: string;
  /** Code agence : "SIE" = Siège, tout autre code = agence régionale. */
  agencyCode: string;
}

export const SIEGE_USER: FakeUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "siege@example.com",
  name: "Utilisateur Siège",
  role: "manager",
  agencyId: 4,
  agencyName: "Siège",
  agencyCode: "SIE",
};

export const OTHER_AGENCY_USER: FakeUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "agence@example.com",
  name: "Utilisateur Agence",
  role: "manager",
  agencyId: 2,
  agencyName: "Agence Bobo",
  agencyCode: "BOB",
};

function buildSession(user: FakeUser) {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  return {
    access_token: "e2e-fake-access-token",
    refresh_token: "e2e-fake-refresh-token",
    token_type: "bearer",
    expires_in: 60 * 60 * 24,
    expires_at: expiresAt,
    user: {
      id: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      phone: "",
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { name: user.name, role: user.role },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/** Requêtes REST observées pendant le test (chemin + table). */
export interface RequestLog {
  urls: string[];
  tables: string[];
}

/**
 * Installe la session + les interceptions réseau puis retourne le journal des
 * requêtes REST émises par l'application.
 */
export async function signInAs(page: Page, user: FakeUser): Promise<RequestLog> {
  const log: RequestLog = { urls: [], tables: [] };

  // Auth : session courante, refresh et déconnexion.
  await page.route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/logout")) {
      return route.fulfill({ status: 204, body: "" });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildSession(user)),
    });
  });

  // REST : profil de l'utilisateur, journal d'audit, et repli générique.
  await page.route("**/rest/v1/**", async (route) => {
    const url = route.request().url();
    const pathname = new URL(url).pathname;
    const table = pathname.replace("/rest/v1/", "").split("?")[0];
    log.urls.push(url);
    log.tables.push(table);

    const isSingle = (route.request().headers()["accept"] ?? "").includes(
      "vnd.pgrst.object+json",
    );

    if (table === "profiles") {
      const profile = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        agency_id: user.agencyId,
        agency: { name: user.agencyName, code: user.agencyCode },
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(isSingle ? profile : [profile]),
      });
    }

    // Le journal d'audit ne doit jamais être atteint par un non-Siège :
    // on renvoie volontairement une ligne pour rendre toute fuite visible.
    if (table === "audit_logs") {
      const row = {
        id: "99999999-9999-4999-8999-999999999999",
        user_id: SIEGE_USER.id,
        user_name: "Fuite Interdite E2E",
        action: "LOGIN",
        entity_type: "auth",
        entity_id: null,
        details: null,
        agency_id: 4,
        created_at: new Date().toISOString(),
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(isSingle ? row : [row]),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: isSingle ? "null" : "[]",
    });
  });

  // Temps réel : inutile pour ces tests.
  await page.route("**/realtime/v1/**", (route) => route.abort());

  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(buildSession(user))] as [string, string],
  );

  return log;
}
