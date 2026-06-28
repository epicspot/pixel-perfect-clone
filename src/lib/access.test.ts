import { describe, it, expect } from "vitest";
import { canAccessAudit } from "@/lib/access";

describe("canAccessAudit", () => {
  it("autorise un utilisateur du Siège (code SIE)", () => {
    expect(canAccessAudit({ agency_code: "SIE" })).toBe(true);
  });

  it("autorise un admin du Siège", () => {
    // Le rôle n'influence pas l'accès : seule l'agence compte.
    expect(canAccessAudit({ agency_code: "SIE" })).toBe(true);
  });

  it("refuse un utilisateur d'une autre agence", () => {
    expect(canAccessAudit({ agency_code: "OUA" })).toBe(false);
    expect(canAccessAudit({ agency_code: "BOB" })).toBe(false);
  });

  it("refuse un utilisateur sans agence", () => {
    expect(canAccessAudit({ agency_code: null })).toBe(false);
    expect(canAccessAudit({})).toBe(false);
    expect(canAccessAudit(null)).toBe(false);
    expect(canAccessAudit(undefined)).toBe(false);
  });

  it("est sensible à la casse (les codes sont stockés en majuscules)", () => {
    expect(canAccessAudit({ agency_code: "sie" })).toBe(false);
    expect(canAccessAudit({ agency_code: "Sie" })).toBe(false);
  });
});
