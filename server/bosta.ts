export type BostaInput = {
  projectName: string;
  projectNumber: string;
  clientName: string;
  locality: string;
  lga: string;
  minimumLotSize: number | null;
  clearingArea: number | null;
  bvMapOverlap: "yes" | "no" | "uncertain";
  significantImpact: "yes" | "no" | "possible";
  assessmentBasis: string;
  constraints: string;
  uncertainty: string;
  recommendation: string;
};

export function getClearingThreshold(minimumLotSize: number | null) {
  if (minimumLotSize === null || !Number.isFinite(minimumLotSize)) return null;
  if (minimumLotSize < 1) return 0.25;
  if (minimumLotSize < 40) return 0.5;
  if (minimumLotSize < 1000) return 1;
  return 2;
}

export function buildBostaMemo(input: BostaInput) {
  const threshold = getClearingThreshold(input.minimumLotSize);
  const clearingTriggered = threshold !== null && input.clearingArea !== null && input.clearingArea > threshold;
  const bvTriggered = input.bvMapOverlap === "yes";
  const impactTriggered = input.significantImpact === "yes";
  const triggered = clearingTriggered || bvTriggered || impactTriggered;
  const pathway = triggered ? "BDAR may be warranted" : "Flora and Fauna Assessment is likely appropriate";

  const pathwayReasons = [
    clearingTriggered ? "area clearing threshold" : null,
    bvTriggered ? "Biodiversity Values Map overlap" : null,
    impactTriggered ? "potential significant impact" : null,
  ].filter(Boolean);

  return {
    title: `BOSTA Stage 1 — ${input.projectName || "Untitled project"}`,
    threshold,
    clearingTriggered,
    bvTriggered,
    impactTriggered,
    pathway,
    pathwayReasons,
    body: {
      assessmentBasis: input.assessmentBasis || "Assessment basis to be confirmed.",
      clearing: threshold === null || input.clearingArea === null
        ? "The applicable clearing threshold requires confirmation once the minimum lot size and disturbance area are available."
        : `The minimum lot size is ${input.minimumLotSize} ha, producing an area clearing threshold of ${threshold} ha. Proposed clearing is ${input.clearingArea} ha and ${clearingTriggered ? "exceeds" : "does not exceed"} the threshold.`,
      constraints: input.constraints || "No additional constraints recorded at this stage.",
      uncertainty: input.uncertainty || "Findings remain subject to confirmation of the final footprint and field verification.",
      recommendation: input.recommendation || `Based on the Stage 1 review, ${pathway.toLowerCase()}, subject to confirmation of the development footprint and ecological values.`,
    },
  };
}
