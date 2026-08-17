import { describe, expect, it } from "vitest";
import { whsDraftGuidance, whsDraftOutputSchema } from "./routers/portal";

describe("WHS Draft Studio guardrails", () => {
  it("requires a controlled draft structure that surfaces review requirements", () => {
    const schema = whsDraftOutputSchema.schema as { required: string[]; properties: Record<string, unknown> };

    expect(schema.required).toContain("assumptionsAndGaps");
    expect(schema.required).toContain("reviewChecklist");
    expect(schema.required).toContain("urgentEscalationNote");
    expect(schema.properties).toHaveProperty("riskRows");
  });

  it("includes safety-specific prompts for every available document type", () => {
    expect(whsDraftGuidance.risk_assessment).toContain("Do not fabricate risk ratings");
    expect(whsDraftGuidance.premobilisation).toContain("mandatory before travel, deployment or site entry");
    expect(whsDraftGuidance.swms).toContain("competent review must be confirmed");
    expect(whsDraftGuidance.psychosocial).toContain("protect confidentiality");
  });
});
