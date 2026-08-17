import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import { portalRouter } from "./routers/portal";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

const generatedDraft = {
  title: "Draft field risk assessment",
  documentControl: {
    status: "Draft for competent review",
    projectOrWork: "Field survey",
    location: "Project site",
    reviewRequired: "Confirm before approval",
  },
  sections: [],
  riskRows: [],
  assumptionsAndGaps: ["[Confirm before approval] Site access arrangements."],
  reviewChecklist: ["Confirm controls with the field lead."],
  urgentEscalationNote: "Escalate urgent hazards through Ecology Consulting's established process.",
};

function context(role: "user" | "admin", id = 1): TrpcContext {
  return {
    user: {
      id,
      openId: `test-${id}`,
      name: "Test user",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function fakeDatabase(ownerId = 1) {
  const where = vi.fn(() => ({ limit: vi.fn(async () => [{ createdBy: ownerId }]) }));
  const db = {
    insert: vi.fn(() => ({ values: vi.fn(async () => [{ insertId: 42 }]) })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) })),
  };
  return db;
}

describe("WHS Draft Studio workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a structured working draft and persists the source inputs", async () => {
    const db = fakeDatabase();
    vi.mocked(getDb).mockResolvedValue(db as never);
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: JSON.stringify(generatedDraft) } }] } as never);

    const result = await portalRouter.createCaller(context("user")).whsDrafts.generate({
      documentType: "risk_assessment",
      title: "Field risk assessment",
      workActivity: "Ecological field survey",
      knownHazards: "Uneven ground",
    });

    expect(result).toEqual({ id: 42, draft: generatedDraft });
    expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-5-mini",
      responseFormat: expect.objectContaining({ type: "json_schema" }),
    }));
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("allows an author to submit a saved draft for review", async () => {
    const db = fakeDatabase(1);
    vi.mocked(getDb).mockResolvedValue(db as never);

    await expect(portalRouter.createCaller(context("user", 1)).whsDrafts.submitForReview({ draftId: 42 })).resolves.toEqual({ success: true });
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("allows an administrator to record a controlled draft review status", async () => {
    const db = fakeDatabase();
    vi.mocked(getDb).mockResolvedValue(db as never);

    await expect(portalRouter.createCaller(context("admin", 9)).admin.reviewWhsDraft({ draftId: 42, status: "approved" })).resolves.toEqual({ success: true });
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
