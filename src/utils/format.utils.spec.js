import { describe, it, expect } from "vitest";
import { money, formatDate } from "./format.utils";

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
