import { test, expect } from "@playwright/test";
import { signInAs, SIEGE_USER, OTHER_AGENCY_USER } from "./helpers/session";

/**
 * Tests e2e des règles d'accès au journal d'audit (/audit).
 *
 * Règle métier : seuls les utilisateurs rattachés au Siège (code agence "SIE")
 * peuvent consulter le journal. Un utilisateur d'une autre agence ne doit voir
 * ni le titre, ni la moindre ligne d'événement, et l'application ne doit même
 * pas interroger la table des événements.
 */

test.describe("Journal d'audit — contrôle d'accès", () => {
  test("un utilisateur d'une autre agence ne voit ni titre ni événement", async ({ page }) => {
    const log = await signInAs(page, OTHER_AGENCY_USER);

    await page.goto("/audit");
    await page.waitForLoadState("networkidle");

    // Soit l'app redirige hors de /audit, soit elle affiche le message de refus.
    const redirected = !new URL(page.url()).pathname.startsWith("/audit");
    if (!redirected) {
      await expect(
        page.getByText("Accès réservé aux utilisateurs du Siège."),
      ).toBeVisible();
    }

    // Aucun titre du journal.
    await expect(
      page.getByRole("heading", { name: /Journal d'Audit/i }),
    ).toHaveCount(0);

    // Aucun élément / ligne d'événement (le mock renverrait "Fuite Interdite E2E").
    await expect(page.getByText("Fuite Interdite E2E")).toHaveCount(0);
    await expect(page.locator("table tbody tr")).toHaveCount(0);

    // Et surtout : aucune requête n'a été émise vers la table des événements.
    expect(log.tables).not.toContain("audit_logs");
  });

  test("un utilisateur du Siège accède au journal et voit les événements", async ({ page }) => {
    const log = await signInAs(page, SIEGE_USER);

    await page.goto("/audit");
    await page.waitForLoadState("networkidle");

    expect(new URL(page.url()).pathname).toContain("/audit");

    await expect(
      page.getByRole("heading", { name: /Journal d'Audit/i }),
    ).toBeVisible();

    await expect(
      page.getByText("Accès réservé aux utilisateurs du Siège."),
    ).toHaveCount(0);

    // La requête sur les événements est bien émise et le contenu s'affiche.
    await expect
      .poll(() => log.tables.includes("audit_logs"), { timeout: 15_000 })
      .toBe(true);
    await expect(page.getByText("Fuite Interdite E2E").first()).toBeVisible();
  });

  test("le lien « Journal audit » est masqué hors Siège et visible au Siège", async ({
    browser,
  }) => {
    const outsideContext = await browser.newContext();
    const outsidePage = await outsideContext.newPage();
    await signInAs(outsidePage, OTHER_AGENCY_USER);
    await outsidePage.goto("/");
    await outsidePage.waitForLoadState("networkidle");
    await expect(
      outsidePage.getByRole("link", { name: /Journal audit/i }),
    ).toHaveCount(0);
    await outsideContext.close();

    const siegeContext = await browser.newContext();
    const siegePage = await siegeContext.newPage();
    await signInAs(siegePage, SIEGE_USER);
    await siegePage.goto("/");
    await siegePage.waitForLoadState("networkidle");
    await expect(
      siegePage.getByRole("link", { name: /Journal audit/i }).first(),
    ).toBeVisible();
    await siegeContext.close();
  });
});
