import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  announcementAcknowledgements,
  announcements,
  bostaMemos,
  documents,
  activityAssignments,
  portalNotifications,
  projectActivities,
  projectAssignments,
  projects,
  projectUpdates,
  staffRequests,
  timesheetEntries,
  trainingCompletions,
  trainingModules,
  users,
  whsComplianceActions,
  whsComplianceItems,
  whsDrafts,
} from "../../drizzle/schema";
import { buildBostaMemo, type BostaInput } from "../bosta";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const requestStatus = z.enum(["submitted", "reviewing", "approved", "declined", "completed"]);
const documentCategory = z.enum(["whs", "swms", "policy", "template", "resource"]);
const projectStatus = z.enum(["planning", "active", "on_hold", "completed"]);
const activityStatus = z.enum(["assigned", "active", "assistance_needed", "paused", "complete"]);
const complianceStatus = z.enum(["compliant", "attention", "overdue", "not_started"]);
const complianceRisk = z.enum(["low", "medium", "high", "critical"]);
const whsDraftType = z.enum(["risk_assessment", "premobilisation", "swms", "psychosocial"]);
const whsDraftStatus = z.enum(["draft", "ready_for_review", "approved"]);

const whsDraftInput = z.object({
  documentType: whsDraftType,
  title: z.string().min(3).max(255),
  projectName: z.string().max(255).optional(),
  siteLocation: z.string().max(255).optional(),
  workActivity: z.string().min(3).max(3000),
  teamAndRoles: z.string().max(3000).optional(),
  workContext: z.string().max(6000).optional(),
  knownHazards: z.string().max(6000).optional(),
  existingControls: z.string().max(6000).optional(),
  emergencyArrangements: z.string().max(4000).optional(),
  consultationNotes: z.string().max(4000).optional(),
  reviewDate: z.string().max(80).optional(),
});

export const whsDraftOutputSchema = {
  name: "ecology_consulting_whs_draft",
  strict: true,
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      documentControl: {
        type: "object",
        properties: {
          status: { type: "string" },
          projectOrWork: { type: "string" },
          location: { type: "string" },
          reviewRequired: { type: "string" },
        },
        required: ["status", "projectOrWork", "location", "reviewRequired"],
        additionalProperties: false,
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            content: { type: "string" },
            items: { type: "array", items: { type: "string" } },
          },
          required: ["heading", "content", "items"],
          additionalProperties: false,
        },
      },
      riskRows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            activityOrHazard: { type: "string" },
            peopleAtRisk: { type: "string" },
            controls: { type: "array", items: { type: "string" } },
            residualRisk: { type: "string" },
          },
          required: ["activityOrHazard", "peopleAtRisk", "controls", "residualRisk"],
          additionalProperties: false,
        },
      },
      assumptionsAndGaps: { type: "array", items: { type: "string" } },
      reviewChecklist: { type: "array", items: { type: "string" } },
      urgentEscalationNote: { type: "string" },
    },
    required: ["title", "documentControl", "sections", "riskRows", "assumptionsAndGaps", "reviewChecklist", "urgentEscalationNote"],
    additionalProperties: false,
  },
};

export const whsDraftGuidance: Record<z.infer<typeof whsDraftType>, string> = {
  risk_assessment: "Create a structured site or task risk assessment. Identify hazards, affected people, controls and residual-risk review prompts. Prefer elimination and substitution controls before engineering, administrative controls and PPE. Do not fabricate risk ratings; mark missing ratings for confirmation.",
  premobilisation: "Create a pre-mobilisation readiness checklist. Treat pre-field planning as mandatory before travel, deployment or site entry. Cover pre-field meeting, team competency and fitness, site access, vehicle readiness, weather and environmental hazard checks, communications, emergency readiness, PPE and equipment. Never represent an item as checked unless supplied by the user.",
  swms: "Create a Safe Work Method Statement drafting outline in Ecology Consulting controlled-document style. Include document control, project/PCBU details, work activity, task sequence, hazards, people at risk, controls, PPE/equipment, emergency arrangements, consultation, worker sign-on and approval/revision prompts. For high-risk work, state that permits, client/site rules and competent review must be confirmed.",
  psychosocial: "Create a psychosocial risk assessment draft. Cover consultation, work context, psychosocial hazards, workers affected, controls, monitoring, review date and WHS Officer review. Do not diagnose individuals or describe personal information; protect confidentiality. State that urgent psychosocial risks must be escalated through Ecology Consulting's established process.",
};

const bostaInput = z.object({
  projectName: z.string().max(255),
  projectNumber: z.string().max(64),
  clientName: z.string().max(255),
  locality: z.string().max(255),
  lga: z.string().max(255),
  minimumLotSize: z.number().nullable(),
  clearingArea: z.number().nullable(),
  bvMapOverlap: z.enum(["yes", "no", "uncertain"]),
  significantImpact: z.enum(["yes", "no", "possible"]),
  assessmentBasis: z.string().max(6000),
  constraints: z.string().max(6000),
  uncertainty: z.string().max(6000),
  recommendation: z.string().max(6000),
});

type PortalUser = { id: number; role: "user" | "admin" };

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The portal database is not available." });
  return db;
}

async function assertProjectAccess(user: PortalUser, projectId: number) {
  if (user.role === "admin") return;
  const db = await database();
  const assignment = await db
    .select({ id: projectAssignments.id })
    .from(projectAssignments)
    .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.staffId, user.id)))
    .limit(1);
  if (!assignment[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This project is not allocated to you." });
}

function parseQuiz(value: string | null) {
  if (!value) return [] as { question: string; options: string[]; answer: string }[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const portalRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await database();
    const isAdmin = ctx.user.role === "admin";
    const now = new Date();

    const [publishedAnnouncements, publishedDocuments, modules] = await Promise.all([
      db.select().from(announcements).where(and(eq(announcements.isPublished, true), sql`(${announcements.expiresAt} IS NULL OR ${announcements.expiresAt} > ${now})`)).orderBy(desc(announcements.publishedAt)).limit(4),
      db.select({ id: documents.id }).from(documents).where(eq(documents.isPublished, true)),
      db.select({ id: trainingModules.id }).from(trainingModules).where(eq(trainingModules.isPublished, true)),
    ]);

    if (isAdmin) {
      const [pending, activeProjects, staff] = await Promise.all([
        db.select({ id: staffRequests.id }).from(staffRequests).where(inArray(staffRequests.status, ["submitted", "reviewing"])),
        db.select({ id: projects.id }).from(projects).where(inArray(projects.status, ["planning", "active", "on_hold"])),
        db.select({ id: users.id }).from(users).where(eq(users.role, "user")),
      ]);
      return {
        role: "admin" as const,
        metrics: [
          { label: "Requests to action", value: pending.length, detail: "Leave, training and equipment", tone: "amber" },
          { label: "Active projects", value: activeProjects.length, detail: "Planning through completion", tone: "green" },
          { label: "Staff accounts", value: staff.length, detail: "Current portal users", tone: "blue" },
          { label: "Published documents", value: publishedDocuments.length, detail: "WHS, templates and resources", tone: "stone" },
        ],
        announcements: publishedAnnouncements,
      };
    }

    const [assignedProjects, ownRequests, completedTraining, ownTimesheets, acknowledgements] = await Promise.all([
      db.select({ id: projects.id, title: projects.title, projectNumber: projects.projectNumber, progress: projects.progress, status: projects.status, dueDate: projects.dueDate })
        .from(projectAssignments)
        .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
        .where(eq(projectAssignments.staffId, ctx.user.id))
        .orderBy(desc(projects.updatedAt))
        .limit(5),
      db.select({ id: staffRequests.id }).from(staffRequests).where(eq(staffRequests.requesterId, ctx.user.id)),
      db.select({ id: trainingCompletions.id }).from(trainingCompletions).where(eq(trainingCompletions.staffId, ctx.user.id)),
      db.select({ id: timesheetEntries.id }).from(timesheetEntries).where(eq(timesheetEntries.staffId, ctx.user.id)),
      db.select({ announcementId: announcementAcknowledgements.announcementId }).from(announcementAcknowledgements).where(eq(announcementAcknowledgements.staffId, ctx.user.id)),
    ]);
    const acknowledged = new Set(acknowledgements.map(item => item.announcementId));
    return {
      role: "staff" as const,
      metrics: [
        { label: "My projects", value: assignedProjects.length, detail: "Currently allocated", tone: "green" },
        { label: "My requests", value: ownRequests.length, detail: "Submitted and tracked", tone: "amber" },
        { label: "Training progress", value: `${completedTraining.length}/${modules.length}`, detail: "Completed modules", tone: "blue" },
        { label: "Timesheet entries", value: ownTimesheets.length, detail: "Internal self-tracking", tone: "stone" },
      ],
      projects: assignedProjects,
      announcements: publishedAnnouncements.map(item => ({ ...item, acknowledged: acknowledged.has(item.id) })),
    };
  }),

  documents: router({
    list: protectedProcedure.input(z.object({ category: documentCategory.optional() }).optional()).query(async ({ input }) => {
      const db = await database();
      const conditions = [eq(documents.isPublished, true)];
      if (input?.category) conditions.push(eq(documents.category, input.category));
      return db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.createdAt));
    }),
  }),

  requests: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select().from(staffRequests).where(eq(staffRequests.requesterId, ctx.user.id)).orderBy(desc(staffRequests.createdAt));
    }),
    submit: protectedProcedure
      .input(z.object({ requestType: z.enum(["leave", "training_equipment"]), subject: z.string().min(3).max(255), details: z.string().min(5).max(5000), startDate: z.date().nullable().optional(), endDate: z.date().nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await database();
        const result = await db.insert(staffRequests).values({ ...input, requesterId: ctx.user.id, startDate: input.startDate ?? null, endDate: input.endDate ?? null });
        return { id: Number(result[0].insertId) };
      }),
  }),

  projects: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      if (ctx.user.role === "admin") return db.select().from(projects).orderBy(desc(projects.updatedAt));
      return db.select({ project: projects, allocationRole: projectAssignments.allocationRole })
        .from(projectAssignments)
        .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
        .where(eq(projectAssignments.staffId, ctx.user.id))
        .orderBy(desc(projects.updatedAt));
    }),
    get: protectedProcedure.input(z.object({ projectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertProjectAccess(ctx.user, input.projectId);
      const db = await database();
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      const updates = await db.select({ update: projectUpdates, authorName: users.name })
        .from(projectUpdates)
        .leftJoin(users, eq(projectUpdates.authorId, users.id))
        .where(eq(projectUpdates.projectId, input.projectId))
        .orderBy(desc(projectUpdates.createdAt));
      return { project, updates };
    }),
    addUpdate: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive(), note: z.string().min(2).max(5000), progress: z.number().int().min(0).max(100).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertProjectAccess(ctx.user, input.projectId);
        const db = await database();
        await db.insert(projectUpdates).values({ projectId: input.projectId, authorId: ctx.user.id, note: input.note, progress: input.progress ?? null });
        if (input.progress !== null && input.progress !== undefined) await db.update(projects).set({ progress: input.progress }).where(eq(projects.id, input.projectId));
        return { success: true };
      }),
  }),

  projectExecution: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      const rows = await db.select({ assignment: activityAssignments, activity: projectActivities, project: projects, seniorName: users.name })
        .from(activityAssignments)
        .innerJoin(projectActivities, eq(activityAssignments.activityId, projectActivities.id))
        .innerJoin(projects, eq(projectActivities.projectId, projects.id))
        .leftJoin(users, eq(projectActivities.assignedSeniorId, users.id))
        .where(eq(activityAssignments.staffId, ctx.user.id))
        .orderBy(desc(projectActivities.updatedAt));
      const ids = rows.map(row => row.activity.id);
      const timeRows = ids.length ? await db.select({ activityId: timesheetEntries.activityId, hours: timesheetEntries.hours }).from(timesheetEntries).where(and(eq(timesheetEntries.staffId, ctx.user.id), inArray(timesheetEntries.activityId, ids))) : [];
      const hours = new Map<number, number>();
      timeRows.forEach(row => { if (row.activityId) hours.set(row.activityId, (hours.get(row.activityId) ?? 0) + Number(row.hours)); });
      return rows.map(row => ({ ...row, loggedHours: hours.get(row.activity.id) ?? 0, steps: parseQuiz(row.activity.stepsJson), links: parseQuiz(row.activity.linksJson), resources: parseQuiz(row.activity.resourcesJson) }));
    }),
    updateStatus: protectedProcedure.input(z.object({ activityId: z.number().int().positive(), status: activityStatus, note: z.string().max(3000).optional() })).mutation(async ({ ctx, input }) => {
      if ((input.status === "assistance_needed" || input.status === "paused") && !input.note?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Please provide the reason for assistance or pause." });
      const db = await database();
      const [assignment] = await db.select().from(activityAssignments).where(and(eq(activityAssignments.activityId, input.activityId), eq(activityAssignments.staffId, ctx.user.id))).limit(1);
      if (!assignment && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "This activity is not allocated to you." });
      const [activity] = await db.select().from(projectActivities).where(eq(projectActivities.id, input.activityId)).limit(1);
      if (!activity) throw new TRPCError({ code: "NOT_FOUND", message: "Project activity not found." });
      await db.update(activityAssignments).set({ status: input.status, assistanceNote: input.status === "assistance_needed" ? input.note ?? null : null, pauseReason: input.status === "paused" ? input.note ?? null : null, completedAt: input.status === "complete" ? new Date() : null }).where(and(eq(activityAssignments.activityId, input.activityId), eq(activityAssignments.staffId, ctx.user.id)));
      const message = input.status === "assistance_needed" ? `Assistance requested: ${input.note}` : input.status === "paused" ? `Activity paused: ${input.note}` : `Activity status updated to ${input.status.replaceAll("_", " ")}.`;
      await db.insert(portalNotifications).values({ recipientId: activity.assignedSeniorId, senderId: ctx.user.id, notificationType: input.status === "assistance_needed" ? "assistance" : "project_update", title: `${activity.title}: ${input.status.replaceAll("_", " ")}`, message, projectId: activity.projectId, activityId: activity.id, actionUrl: "/admin" });
      return { success: true };
    }),
  }),

  notifications: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select().from(portalNotifications).where(eq(portalNotifications.recipientId, ctx.user.id)).orderBy(desc(portalNotifications.createdAt));
    }),
    markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.update(portalNotifications).set({ isRead: true }).where(and(eq(portalNotifications.id, input.notificationId), eq(portalNotifications.recipientId, ctx.user.id)));
      return { success: true };
    }),
  }),

  timesheets: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select({ entry: timesheetEntries, projectNumber: projects.projectNumber, projectTitle: projects.title })
        .from(timesheetEntries)
        .leftJoin(projects, eq(timesheetEntries.projectId, projects.id))
        .where(eq(timesheetEntries.staffId, ctx.user.id))
        .orderBy(desc(timesheetEntries.entryDate));
    }),
    create: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive().nullable(), activityId: z.number().int().positive().nullable().optional(), entryDate: z.date(), hours: z.number().min(0.25).max(24), activity: z.string().min(2).max(255), notes: z.string().max(3000).optional() }))
      .mutation(async ({ ctx, input }) => {
        if (input.projectId) await assertProjectAccess(ctx.user, input.projectId);
        const db = await database();
        const result = await db.insert(timesheetEntries).values({ ...input, projectId: input.projectId ?? null, activityId: input.activityId ?? null, staffId: ctx.user.id, hours: String(input.hours), notes: input.notes ?? null });
        return { id: Number(result[0].insertId) };
      }),
  }),

  training: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      const modules = await db.select().from(trainingModules).where(eq(trainingModules.isPublished, true)).orderBy(desc(trainingModules.createdAt));
      const completions = await db.select().from(trainingCompletions).where(eq(trainingCompletions.staffId, ctx.user.id));
      const done = new Map(completions.map(item => [item.moduleId, item]));
      return modules.map(item => ({ ...item, quiz: parseQuiz(item.quizJson), completion: done.get(item.id) ?? null }));
    }),
    complete: protectedProcedure
      .input(z.object({ moduleId: z.number().int().positive(), answers: z.array(z.string()).default([]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await database();
        const [module] = await db.select().from(trainingModules).where(and(eq(trainingModules.id, input.moduleId), eq(trainingModules.isPublished, true))).limit(1);
        if (!module) throw new TRPCError({ code: "NOT_FOUND", message: "Training module not found." });
        const quiz = parseQuiz(module.quizJson);
        const correct = quiz.filter((question, index) => question.answer === input.answers[index]).length;
        const score = quiz.length ? Math.round((correct / quiz.length) * 100) : 100;
        const passed = score >= 80;
        await db.insert(trainingCompletions).values({ moduleId: module.id, staffId: ctx.user.id, score, passed }).onDuplicateKeyUpdate({ set: { score, passed, completedAt: new Date() } });
        return { score, passed };
      }),
  }),

  announcements: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      const items = await db.select().from(announcements).where(eq(announcements.isPublished, true)).orderBy(desc(announcements.publishedAt));
      const acknowledgements = await db.select({ announcementId: announcementAcknowledgements.announcementId }).from(announcementAcknowledgements).where(eq(announcementAcknowledgements.staffId, ctx.user.id));
      const acknowledged = new Set(acknowledgements.map(item => item.announcementId));
      return items.map(item => ({ ...item, acknowledged: acknowledged.has(item.id) }));
    }),
    acknowledge: protectedProcedure.input(z.object({ announcementId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(announcementAcknowledgements).values({ announcementId: input.announcementId, staffId: ctx.user.id }).onDuplicateKeyUpdate({ set: { acknowledgedAt: new Date() } });
      return { success: true };
    }),
  }),

  bosta: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select().from(bostaMemos).where(eq(bostaMemos.createdBy, ctx.user.id)).orderBy(desc(bostaMemos.updatedAt));
    }),
    generate: protectedProcedure.input(bostaInput).mutation(async ({ ctx, input }) => {
      const db = await database();
      const memo = buildBostaMemo(input as BostaInput);
      const result = await db.insert(bostaMemos).values({ createdBy: ctx.user.id, title: memo.title, inputJson: JSON.stringify(input), memoJson: JSON.stringify(memo), status: "ready_for_review" });
      return { id: Number(result[0].insertId), memo };
    }),
  }),

  whsDrafts: router({
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const db = await database();
      return db.select().from(whsDrafts).where(eq(whsDrafts.createdBy, ctx.user.id)).orderBy(desc(whsDrafts.updatedAt));
    }),
    get: protectedProcedure.input(z.object({ draftId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await database();
      const [draft] = await db.select().from(whsDrafts).where(eq(whsDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "WHS draft not found." });
      if (draft.createdBy !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this WHS draft." });
      return draft;
    }),
    generate: protectedProcedure.input(whsDraftInput).mutation(async ({ ctx, input }) => {
      const sourceSummary = JSON.stringify(input, null, 2);
      const response = await invokeLLM({
        model: "gpt-5-mini",
        maxTokens: 5000,
        messages: [
          {
            role: "system",
            content: `You are Ecology Consulting's internal WHS drafting assistant. Use Australian English and prepare a working draft only. Never approve a document, confirm work is safe to commence, invent site conditions, invent controls, or omit uncertainty. Use only supplied information; put missing information into assumptionsAndGaps as [Confirm before approval]. Every document must be labelled Draft for competent review and must state that it requires field verification, consultation and Ecology Consulting approval before use. ${whsDraftGuidance[input.documentType]}`,
          },
          {
            role: "user",
            content: `Prepare the requested ${input.documentType.replace("_", " ")} draft from the following staff-supplied information:\n${sourceSummary}`,
          },
        ],
        responseFormat: { type: "json_schema", json_schema: whsDraftOutputSchema },
      });
      const content = response.choices[0]?.message.content;
      if (typeof content !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The drafting assistant returned an unreadable response." });
      let generated: unknown;
      try {
        generated = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The drafting assistant returned an invalid draft format." });
      }
      const db = await database();
      const result = await db.insert(whsDrafts).values({
        createdBy: ctx.user.id,
        documentType: input.documentType,
        title: input.title,
        projectName: input.projectName ?? null,
        inputJson: JSON.stringify(input),
        draftJson: JSON.stringify(generated),
        aiModel: "gpt-5-mini",
        status: "draft",
      });
      return { id: Number(result[0].insertId), draft: generated };
    }),
    submitForReview: protectedProcedure.input(z.object({ draftId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const [draft] = await db.select({ createdBy: whsDrafts.createdBy }).from(whsDrafts).where(eq(whsDrafts.id, input.draftId)).limit(1);
      if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "WHS draft not found." });
      if (draft.createdBy !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to submit this draft." });
      await db.update(whsDrafts).set({ status: "ready_for_review" }).where(eq(whsDrafts.id, input.draftId));
      return { success: true };
    }),
  }),

  admin: router({
    users: adminProcedure.query(async () => {
      const db = await database();
      return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users).orderBy(desc(users.lastSignedIn));
    }),
    setUserRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId && input.role !== "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own administrator access." });
      const db = await database();
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),
    requests: adminProcedure.query(async () => {
      const db = await database();
      return db.select({ request: staffRequests, requesterName: users.name, requesterEmail: users.email })
        .from(staffRequests)
        .leftJoin(users, eq(staffRequests.requesterId, users.id))
        .orderBy(desc(staffRequests.createdAt));
    }),
    documents: adminProcedure.query(async () => {
      const db = await database();
      return db.select().from(documents).orderBy(desc(documents.createdAt));
    }),
    projectStatus: adminProcedure.query(async () => {
      const db = await database();
      const [projectRows, assignmentRows] = await Promise.all([
        db.select().from(projects).orderBy(desc(projects.updatedAt)),
        db.select({ projectId: projectAssignments.projectId }).from(projectAssignments),
      ]);
      const allocationCount = new Map<number, number>();
      assignmentRows.forEach(row => allocationCount.set(row.projectId, (allocationCount.get(row.projectId) ?? 0) + 1));
      return projectRows.map(project => ({ ...project, allocatedStaff: allocationCount.get(project.id) ?? 0 }));
    }),
    activity: adminProcedure.query(async () => {
      const db = await database();
      return db.select({ entry: timesheetEntries, staffName: users.name, staffEmail: users.email, projectNumber: projects.projectNumber, projectTitle: projects.title })
        .from(timesheetEntries)
        .leftJoin(users, eq(timesheetEntries.staffId, users.id))
        .leftJoin(projects, eq(timesheetEntries.projectId, projects.id))
        .orderBy(desc(timesheetEntries.entryDate))
        .limit(25);
    }),
    bostaMemos: adminProcedure.query(async () => {
      const db = await database();
      return db.select({ memo: bostaMemos, authorName: users.name, authorEmail: users.email })
        .from(bostaMemos)
        .leftJoin(users, eq(bostaMemos.createdBy, users.id))
        .orderBy(desc(bostaMemos.updatedAt));
    }),
    whsDrafts: adminProcedure.query(async () => {
      const db = await database();
      return db.select({ draft: whsDrafts, authorName: users.name, authorEmail: users.email })
        .from(whsDrafts)
        .leftJoin(users, eq(whsDrafts.createdBy, users.id))
        .orderBy(desc(whsDrafts.updatedAt));
    }),
    reviewWhsDraft: adminProcedure.input(z.object({ draftId: z.number().int().positive(), status: whsDraftStatus })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.update(whsDrafts).set({ status: input.status, reviewedBy: ctx.user.id, reviewedAt: new Date() }).where(eq(whsDrafts.id, input.draftId));
      return { success: true };
    }),
    actionRequest: adminProcedure.input(z.object({ requestId: z.number().int().positive(), status: requestStatus, adminNote: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.update(staffRequests).set({ status: input.status, adminNote: input.adminNote ?? null, actionedBy: ctx.user.id, actionedAt: new Date() }).where(eq(staffRequests.id, input.requestId));
      return { success: true };
    }),
    uploadDocument: adminProcedure.input(z.object({ title: z.string().min(3).max(255), description: z.string().max(2000).optional(), category: documentCategory, fileName: z.string().min(1).max(255), contentType: z.string().min(3).max(120), base64: z.string().min(4).max(15_000_000) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const content = Buffer.from(input.base64, "base64");
      if (content.byteLength > 10_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Files must be 10 MB or smaller." });
      const stored = await storagePut(`ecology-consulting/${input.category}/${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`, content, input.contentType);
      const result = await db.insert(documents).values({ title: input.title, description: input.description ?? null, category: input.category, fileName: input.fileName, storageKey: stored.key, storageUrl: stored.url, uploadedBy: ctx.user.id });
      return { id: Number(result[0].insertId), url: stored.url };
    }),
    createProject: adminProcedure.input(z.object({ projectNumber: z.string().min(2).max(64), title: z.string().min(3).max(255), clientName: z.string().max(255).optional(), clientContactName: z.string().max(255).optional(), clientContactEmail: z.string().email().optional().or(z.literal("")), clientContactPhone: z.string().max(64).optional(), sharepointUrl: z.string().url().optional().or(z.literal("")), description: z.string().max(5000).optional(), status: projectStatus, dueDate: z.date().nullable(), startDate: z.date().nullable().optional(), endDate: z.date().nullable().optional(), budgetHours: z.number().min(0).optional(), budgetAmount: z.number().min(0).optional(), staffIds: z.array(z.number().int().positive()).default([]), activities: z.array(z.object({ title: z.string().min(2).max(255), description: z.string().max(5000).optional(), budgetHours: z.number().min(0), startDate: z.date().nullable(), endDate: z.date().nullable(), taskBrief: z.string().max(6000).optional(), seniorGuidance: z.string().max(6000).optional(), exampleContent: z.string().max(6000).optional(), steps: z.array(z.string().max(1000)).max(20).default([]), links: z.array(z.string().url()).max(20).default([]), resources: z.array(z.string().max(1000)).max(20).default([]), staffIds: z.array(z.number().int().positive()).default([]) })).default([]) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const result = await db.insert(projects).values({ projectNumber: input.projectNumber, title: input.title, clientName: input.clientName ?? null, clientContactName: input.clientContactName ?? null, clientContactEmail: input.clientContactEmail || null, clientContactPhone: input.clientContactPhone ?? null, sharepointUrl: input.sharepointUrl || null, description: input.description ?? null, status: input.status, dueDate: input.dueDate, startDate: input.startDate ?? null, endDate: input.endDate ?? null, budgetHours: input.budgetHours !== undefined ? String(input.budgetHours) : null, budgetAmount: input.budgetAmount !== undefined ? String(input.budgetAmount) : null, createdBy: ctx.user.id });
      const projectId = Number(result[0].insertId);
      if (input.staffIds.length) await db.insert(projectAssignments).values(input.staffIds.map(staffId => ({ projectId, staffId, allocatedBy: ctx.user.id })));
      for (const activity of input.activities) {
        const insert = await db.insert(projectActivities).values({ projectId, title: activity.title, activityDescription: activity.description ?? null, budgetHours: String(activity.budgetHours), startDate: activity.startDate, endDate: activity.endDate, taskBrief: activity.taskBrief ?? null, seniorGuidance: activity.seniorGuidance ?? null, exampleContent: activity.exampleContent ?? null, stepsJson: JSON.stringify(activity.steps), linksJson: JSON.stringify(activity.links), resourcesJson: JSON.stringify(activity.resources), assignedSeniorId: ctx.user.id });
        const activityId = Number(insert[0].insertId);
        if (activity.staffIds.length) await db.insert(activityAssignments).values(activity.staffIds.map(staffId => ({ activityId, staffId, assignmentRole: "Allocated activity" })));
      }
      return { id: projectId };
    }),
    projectHealth: adminProcedure.query(async () => {
      const db = await database();
      const [projectRows, activityRows, assignmentRows, entryRows] = await Promise.all([db.select().from(projects), db.select().from(projectActivities), db.select().from(activityAssignments), db.select({ activityId: timesheetEntries.activityId, hours: timesheetEntries.hours }).from(timesheetEntries)]);
      return projectRows.map(project => {
        const activities = activityRows.filter(activity => activity.projectId === project.id);
        const activityIds = new Set(activities.map(activity => activity.id));
        const activityBudget = activities.reduce((total, activity) => total + Number(activity.budgetHours), 0);
        const loggedHours = entryRows.filter(entry => entry.activityId && activityIds.has(entry.activityId)).reduce((total, entry) => total + Number(entry.hours), 0);
        const complete = activities.length ? activities.filter(activity => activity.status === "complete").length / activities.length * 100 : project.progress;
        const overdue = Boolean(project.endDate && project.endDate < new Date() && complete < 100);
        const atRisk = overdue || (activityBudget > 0 && loggedHours > activityBudget);
        return { project, activities, allocatedStaff: assignmentRows.filter(assignment => activityIds.has(assignment.activityId)).length, budgetHours: activityBudget || Number(project.budgetHours ?? 0), loggedHours, completion: Math.round(complete), health: atRisk ? "at_risk" : "on_track" };
      });
    }),
    complianceDashboard: adminProcedure.query(async () => {
      const db = await database();
      const [items, actions] = await Promise.all([db.select().from(whsComplianceItems).orderBy(desc(whsComplianceItems.nextReviewDate)), db.select().from(whsComplianceActions).orderBy(desc(whsComplianceActions.createdAt))]);
      const now = new Date();
      return { items, actions, summary: { compliant: items.filter(item => item.status === "compliant").length, attention: items.filter(item => item.status === "attention").length, overdue: items.filter(item => item.status === "overdue" || Boolean(item.nextReviewDate && item.nextReviewDate < now)).length, openActions: actions.filter(action => !["complete"].includes(action.status)).length } };
    }),
    createComplianceItem: adminProcedure.input(z.object({ category: z.string().min(2).max(160), requirement: z.string().min(3).max(500), reference: z.string().max(255).optional(), complianceRequirement: z.string().max(5000).optional(), evidence: z.string().max(5000).optional(), responsiblePosition: z.string().max(255).optional(), responsibleUserId: z.number().int().positive().nullable(), reviewFrequency: z.string().max(120).optional(), nextReviewDate: z.date().nullable(), status: complianceStatus, riskLevel: complianceRisk })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const result = await db.insert(whsComplianceItems).values({ ...input, reference: input.reference ?? null, complianceRequirement: input.complianceRequirement ?? null, evidence: input.evidence ?? null, responsiblePosition: input.responsiblePosition ?? null, responsibleUserId: input.responsibleUserId ?? null, reviewFrequency: input.reviewFrequency ?? null, nextReviewDate: input.nextReviewDate, createdBy: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),
    requestComplianceAction: adminProcedure.input(z.object({ complianceItemId: z.number().int().positive(), assignedTo: z.number().int().positive(), actionType: z.enum(["review", "draft", "complete", "amend"]), instructions: z.string().min(3).max(5000), dueDate: z.date().nullable() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const result = await db.insert(whsComplianceActions).values({ ...input, dueDate: input.dueDate, requestedBy: ctx.user.id });
      await db.insert(portalNotifications).values({ recipientId: input.assignedTo, senderId: ctx.user.id, notificationType: "whs_action", title: `WHS action requested: ${input.actionType}`, message: input.instructions, actionUrl: "/staff/whs-drafts" });
      return { id: Number(result[0].insertId) };
    }),
    assignProject: adminProcedure.input(z.object({ projectId: z.number().int().positive(), staffId: z.number().int().positive(), allocationRole: z.string().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.insert(projectAssignments).values({ ...input, allocatedBy: ctx.user.id }).onDuplicateKeyUpdate({ set: { allocationRole: input.allocationRole, allocatedBy: ctx.user.id, allocatedAt: new Date() } });
      return { success: true };
    }),
    createTraining: adminProcedure.input(z.object({ title: z.string().min(3).max(255), description: z.string().max(4000).optional(), category: z.string().min(2).max(120), resourceName: z.string().max(255).optional(), resourceUrl: z.string().url().optional(), resourceFile: z.object({ fileName: z.string().min(1).max(255), contentType: z.string().min(3).max(120), base64: z.string().min(4).max(15_000_000) }).optional(), quiz: z.array(z.object({ question: z.string().min(3).max(500), options: z.array(z.string().min(1).max(180)).min(2).max(4), answer: z.string().min(1).max(180) })).max(10) })).mutation(async ({ ctx, input }) => {
      const db = await database();
      let uploadedResource: { key: string; url: string } | null = null;
      if (input.resourceFile) {
        const content = Buffer.from(input.resourceFile.base64, "base64");
        if (content.byteLength > 10_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Training resources must be 10 MB or smaller." });
        uploadedResource = await storagePut(`ecology-consulting/training/${input.resourceFile.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`, content, input.resourceFile.contentType);
      }
      const result = await db.insert(trainingModules).values({ title: input.title, description: input.description ?? null, category: input.category, resourceName: input.resourceFile?.fileName ?? input.resourceName ?? null, resourceKey: uploadedResource?.key ?? null, resourceUrl: uploadedResource?.url ?? input.resourceUrl ?? null, quizJson: JSON.stringify(input.quiz), createdBy: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),
    createAnnouncement: adminProcedure.input(z.object({ title: z.string().min(3).max(255), content: z.string().min(3).max(5000), priority: z.enum(["standard", "important", "urgent"]), acknowledgementRequired: z.boolean(), expiresAt: z.date().nullable() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      const result = await db.insert(announcements).values({ ...input, expiresAt: input.expiresAt, publishedBy: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),
  }),
});
