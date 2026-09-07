import { describe, it, expect } from "vitest";
import { describeError, errorMessage, isSessionExpired } from "./errors";

describe("describeError", () => {
  it("traduit un doublon Postgres", () => {
    const e = describeError({ code: "23505", message: 'duplicate key value violates unique constraint' });
    expect(e.title).toBe("Doublon détecté");
    expect(e.detail).toMatch(/existe déjà/);
  });

  it("traduit une violation de clé étrangère", () => {
    expect(describeError({ code: "23503" }).title).toBe("Opération bloquée par des données liées");
  });

  it("traduit un refus RLS", () => {
    expect(describeError({ code: "42501" }).title).toBe("Accès refusé");
    expect(describeError({ message: "new row violates row-level security policy" }).title).toBe("Accès refusé");
  });

  it("traduit une panne réseau", () => {
    expect(describeError(new TypeError("Failed to fetch")).title).toBe("Connexion indisponible");
  });

  it("traduit des identifiants invalides", () => {
    expect(describeError({ message: "Invalid login credentials" }).title).toBe("Identifiants incorrects");
  });

  it("détecte une session expirée", () => {
    expect(isSessionExpired({ message: "JWT expired" })).toBe(true);
    expect(isSessionExpired({ code: "23505" })).toBe(false);
  });

  it("traduit un champ obligatoire manquant", () => {
    expect(describeError({ code: "23502" }).title).toBe("Champ obligatoire manquant");
  });

  it("traduit un fichier trop volumineux", () => {
    expect(describeError({ message: "The object exceeded the maximum allowed size" }).title).toBe(
      "Fichier trop volumineux",
    );
  });

  it("utilise le titre de repli et le contexte", () => {
    const e = describeError({}, { fallbackTitle: "Enregistrement impossible", context: "la création du voyage" });
    expect(e.title).toBe("Enregistrement impossible");
    expect(e.detail).toMatch(/la création du voyage/);
  });

  it("conserve un message brut lisible en dernier recours", () => {
    expect(describeError({ message: "Solde de caisse incohérent" }).detail).toBe("Solde de caisse incohérent");
  });

  it("compose un message sur une ligne", () => {
    expect(errorMessage({ code: "23505" })).toMatch(/^Doublon détecté — /);
  });
});
