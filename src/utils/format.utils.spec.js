import { describe, it, expect } from "vitest";
import { money, formatDate, payoutStatusLabel } from "./format.utils";

describe("money", () => {
  it("formate un montant en euros (fr-FR)", () => {
    expect(money(42.5)).toContain("42,50");
    expect(money(42.5)).toContain("€");
  });

  it("traite null/undefined comme 0", () => {
    expect(money(null)).toContain("0,00");
    expect(money(undefined)).toContain("0,00");
  });
});

describe("formatDate", () => {
  it("formate une date ISO en date française", () => {
    expect(formatDate("2026-09-12T10:00:00Z")).toMatch(/12\/09\/2026/);
  });
});

describe("payoutStatusLabel", () => {
  it("traduit les statuts de virement Stripe", () => {
    expect(payoutStatusLabel("paid")).toBe("Versé");
    expect(payoutStatusLabel("in_transit")).toBe("En cours");
    expect(payoutStatusLabel("failed")).toBe("Échoué");
  });

  it("renvoie le statut brut s'il est inconnu", () => {
    expect(payoutStatusLabel("weird")).toBe("weird");
  });
});
