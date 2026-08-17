import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { portalRouter } from "./routers/portal";

vi.mock("./db", () => ({ getDb: vi.fn() }));

function context(role: "user" | "admin", id = 1): TrpcContext {
  return {
    user: { id, openId: `user-${id}`, name: "Test user", email: "test@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function activityDb() {
  const values = vi.fn(async () => [{ insertId: 71 }]);
  const select = vi.fn()
    .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ activityId: 7, staffId: 1 }]) })) })) })
    .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 7, title: "Habitat survey", assignedSeniorId: 9, projectId: 3 }]) })) })) });
  return { select, insert: vi.fn(() => ({ values })), update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) })), values };
}

describe("project execution and compliance workflows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires a reason before a staff member can pause work or request assistance", async () => {
    const caller = portalRouter.createCaller(context("user"));
    await expect(caller.projectExecution.updateStatus({ activityId: 7, status: "paused" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.projectExecution.updateStatus({ activityId: 7, status: "assistance_needed" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("notifies the allocating Senior when a staff member requests assistance", async () => {
    const db = activityDb();
    vi.mocked(getDb).mockResolvedValue(db as never);

    await expect(portalRouter.createCaller(context("user", 1)).projectExecution.updateStatus({ activityId: 7, status: "assistance_needed", note: "Need site access clarification" })).resolves.toEqual({ success: true });

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.values).toHaveBeenLastCalledWith(expect.objectContaining({ recipientId: 9, senderId: 1, notificationType: "assistance", projectId: 3, activityId: 7 }));
  });

  it("flags a project as at risk when logged activity time exceeds the activity budget", async () => {
    const select = vi.fn()
      .mockReturnValueOnce({ from: vi.fn(async () => [{ id: 3, progress: 20, budgetHours: "10", endDate: null }]) })
      .mockReturnValueOnce({ from: vi.fn(async () => [{ id: 7, projectId: 3, budgetHours: "10", status: "active" }]) })
      .mockReturnValueOnce({ from: vi.fn(async () => [{ activityId: 7, staffId: 1 }]) })
      .mockReturnValueOnce({ from: vi.fn(async () => [{ activityId: 7, hours: "12" }]) });
    vi.mocked(getDb).mockResolvedValue({ select } as never);

    const health = await portalRouter.createCaller(context("admin", 9)).admin.projectHealth();
    expect(health[0]).toMatchObject({ budgetHours: 10, loggedHours: 12, health: "at_risk" });
  });

  it("creates a WHS action request and sends it to the responsible staff member", async () => {
    const values = vi.fn(async () => [{ insertId: 12 }]);
    const db = { insert: vi.fn(() => ({ values })) };
    vi.mocked(getDb).mockResolvedValue(db as never);

    await expect(portalRouter.createCaller(context("admin", 9)).admin.requestComplianceAction({ complianceItemId: 4, assignedTo: 2, actionType: "review", instructions: "Review the current field safety procedure.", dueDate: null })).resolves.toEqual({ id: 12 });
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(values).toHaveBeenLastCalledWith(expect.objectContaining({ recipientId: 2, senderId: 9, notificationType: "whs_action", actionUrl: "/staff/whs-drafts" }));
  });
});
