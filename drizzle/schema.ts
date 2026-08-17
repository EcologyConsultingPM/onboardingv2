import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["whs", "swms", "policy", "template", "resource"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 512 }).notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  isPublished: boolean("isPublished").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const staffRequests = mysqlTable("staffRequests", {
  id: int("id").autoincrement().primaryKey(),
  requesterId: int("requesterId").notNull(),
  requestType: mysqlEnum("requestType", ["leave", "training_equipment"]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  details: text("details").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["submitted", "reviewing", "approved", "declined", "completed"])
    .default("submitted")
    .notNull(),
  adminNote: text("adminNote"),
  actionedBy: int("actionedBy"),
  actionedAt: timestamp("actionedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  projectNumber: varchar("projectNumber", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  clientName: varchar("clientName", { length: 255 }),
  clientContactName: varchar("clientContactName", { length: 255 }),
  clientContactEmail: varchar("clientContactEmail", { length: 320 }),
  clientContactPhone: varchar("clientContactPhone", { length: 64 }),
  sharepointUrl: varchar("sharepointUrl", { length: 512 }),
  description: text("description"),
  status: mysqlEnum("status", ["planning", "active", "on_hold", "completed"]).default("planning").notNull(),
  dueDate: timestamp("dueDate"),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  budgetHours: decimal("budgetHours", { precision: 9, scale: 2 }),
  budgetAmount: decimal("budgetAmount", { precision: 12, scale: 2 }),
  progress: int("progress").default(0).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectAssignments = mysqlTable(
  "projectAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    staffId: int("staffId").notNull(),
    allocationRole: varchar("allocationRole", { length: 120 }).default("Project team member").notNull(),
    allocatedBy: int("allocatedBy").notNull(),
    allocatedAt: timestamp("allocatedAt").defaultNow().notNull(),
  },
  table => [unique("project_staff_unique").on(table.projectId, table.staffId)],
);

export const projectUpdates = mysqlTable("projectUpdates", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  authorId: int("authorId").notNull(),
  note: text("note").notNull(),
  progress: int("progress"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const timesheetEntries = mysqlTable("timesheetEntries", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  projectId: int("projectId"),
  activityId: int("activityId"),
  entryDate: timestamp("entryDate").notNull(),
  hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
  activity: varchar("activity", { length: 255 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectActivities = mysqlTable("projectActivities", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  activityDescription: text("activityDescription"),
  budgetHours: decimal("budgetHours", { precision: 9, scale: 2 }).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["planning", "active", "paused", "complete"]).default("planning").notNull(),
  taskBrief: text("taskBrief"),
  seniorGuidance: text("seniorGuidance"),
  exampleContent: text("exampleContent"),
  stepsJson: text("stepsJson"),
  linksJson: text("linksJson"),
  resourcesJson: text("resourcesJson"),
  assignedSeniorId: int("assignedSeniorId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const activityAssignments = mysqlTable(
  "activityAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    activityId: int("activityId").notNull(),
    staffId: int("staffId").notNull(),
    assignmentRole: varchar("assignmentRole", { length: 120 }).default("Project team member").notNull(),
    status: mysqlEnum("status", ["assigned", "active", "assistance_needed", "paused", "complete"]).default("assigned").notNull(),
    assistanceNote: text("assistanceNote"),
    pauseReason: text("pauseReason"),
    completedAt: timestamp("completedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [unique("activity_staff_unique").on(table.activityId, table.staffId)],
);

export const portalNotifications = mysqlTable("portalNotifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  senderId: int("senderId"),
  notificationType: mysqlEnum("notificationType", ["project_update", "assistance", "whs_action"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  projectId: int("projectId"),
  activityId: int("activityId"),
  actionUrl: varchar("actionUrl", { length: 512 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const whsComplianceItems = mysqlTable("whsComplianceItems", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 160 }).notNull(),
  requirement: varchar("requirement", { length: 500 }).notNull(),
  reference: varchar("reference", { length: 255 }),
  complianceRequirement: text("complianceRequirement"),
  evidence: text("evidence"),
  responsiblePosition: varchar("responsiblePosition", { length: 255 }),
  responsibleUserId: int("responsibleUserId"),
  reviewFrequency: varchar("reviewFrequency", { length: 120 }),
  nextReviewDate: timestamp("nextReviewDate"),
  status: mysqlEnum("status", ["compliant", "attention", "overdue", "not_started"]).default("not_started").notNull(),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const whsComplianceActions = mysqlTable("whsComplianceActions", {
  id: int("id").autoincrement().primaryKey(),
  complianceItemId: int("complianceItemId").notNull(),
  assignedTo: int("assignedTo").notNull(),
  actionType: mysqlEnum("actionType", ["review", "draft", "complete", "amend"]).notNull(),
  instructions: text("instructions").notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["requested", "in_progress", "complete", "overdue"]).default("requested").notNull(),
  requestedBy: int("requestedBy").notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const trainingModules = mysqlTable("trainingModules", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 120 }).default("General").notNull(),
  resourceName: varchar("resourceName", { length: 255 }),
  resourceKey: varchar("resourceKey", { length: 512 }),
  resourceUrl: varchar("resourceUrl", { length: 512 }),
  quizJson: text("quizJson"),
  isPublished: boolean("isPublished").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const trainingCompletions = mysqlTable(
  "trainingCompletions",
  {
    id: int("id").autoincrement().primaryKey(),
    moduleId: int("moduleId").notNull(),
    staffId: int("staffId").notNull(),
    score: int("score"),
    passed: boolean("passed").default(false).notNull(),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
  },
  table => [unique("training_staff_unique").on(table.moduleId, table.staffId)],
);

export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  priority: mysqlEnum("priority", ["standard", "important", "urgent"]).default("standard").notNull(),
  acknowledgementRequired: boolean("acknowledgementRequired").default(false).notNull(),
  isPublished: boolean("isPublished").default(true).notNull(),
  publishedBy: int("publishedBy").notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export const announcementAcknowledgements = mysqlTable(
  "announcementAcknowledgements",
  {
    id: int("id").autoincrement().primaryKey(),
    announcementId: int("announcementId").notNull(),
    staffId: int("staffId").notNull(),
    acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
  },
  table => [unique("announcement_staff_unique").on(table.announcementId, table.staffId)],
);

export const bostaMemos = mysqlTable("bostaMemos", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  inputJson: text("inputJson").notNull(),
  memoJson: text("memoJson").notNull(),
  status: mysqlEnum("status", ["draft", "ready_for_review", "approved"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const whsDrafts = mysqlTable("whsDrafts", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  documentType: mysqlEnum("documentType", ["risk_assessment", "premobilisation", "swms", "psychosocial"])
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  projectName: varchar("projectName", { length: 255 }),
  inputJson: text("inputJson").notNull(),
  draftJson: text("draftJson").notNull(),
  aiModel: varchar("aiModel", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["draft", "ready_for_review", "approved"])
    .default("draft")
    .notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
