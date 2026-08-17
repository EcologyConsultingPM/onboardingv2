import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { adminProcedure, router } from "./_core/trpc";

const accessRouter = router({
  administratorCheck: adminProcedure.query(() => ({ allowed: true })),
});

function context(role: "user" | "admin" | null): TrpcContext {
  return {
    user: role ? {
      id: 1,
      openId: "test-user",
      name: "Test user",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } : null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("administrator access boundaries", () => {
  it("permits an administrator procedure for an administrator", async () => {
    await expect(accessRouter.createCaller(context("admin")).administratorCheck()).resolves.toEqual({ allowed: true });
  });

  it("blocks a staff member from an administrator procedure", async () => {
    await expect(accessRouter.createCaller(context("user")).administratorCheck()).rejects.toBeInstanceOf(TRPCError);
  });
});
