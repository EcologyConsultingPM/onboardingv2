import { describe, expect, it } from "vitest";
import { buildBostaMemo, getClearingThreshold } from "./bosta";

describe("BOSTA Stage 1 calculation", () => {
  it("uses the supplied minimum lot size thresholds", () => {
    expect(getClearingThreshold(0.9)).toBe(0.25);
    expect(getClearingThreshold(10)).toBe(0.5);
    expect(getClearingThreshold(60)).toBe(1);
    expect(getClearingThreshold(1200)).toBe(2);
    expect(getClearingThreshold(null)).toBeNull();
  });

  it("flags a preliminary BDAR pathway when a BOS trigger is present", () => {
    const memo = buildBostaMemo({
      projectName: "Woodland subdivision",
      projectNumber: "EC-2026-014",
      clientName: "Example Client",
      locality: "Canberra",
      lga: "ACT",
      minimumLotSize: 15,
      clearingArea: 0.75,
      bvMapOverlap: "no",
      significantImpact: "no",
      assessmentBasis: "Desktop review",
      constraints: "Remnant trees",
      uncertainty: "Footprint pending confirmation",
      recommendation: "",
    });

    expect(memo.clearingTriggered).toBe(true);
    expect(memo.pathway).toBe("BDAR may be warranted");
    expect(memo.pathwayReasons).toContain("area clearing threshold");
  });
});
