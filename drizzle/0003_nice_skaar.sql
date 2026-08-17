CREATE TABLE `activityAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`staffId` int NOT NULL,
	`assignmentRole` varchar(120) NOT NULL DEFAULT 'Project team member',
	`status` enum('assigned','active','assistance_needed','paused','complete') NOT NULL DEFAULT 'assigned',
	`assistanceNote` text,
	`pauseReason` text,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activityAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_staff_unique` UNIQUE(`activityId`,`staffId`)
);
--> statement-breakpoint
CREATE TABLE `portalNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`senderId` int,
	`notificationType` enum('project_update','assistance','whs_action') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`projectId` int,
	`activityId` int,
	`actionUrl` varchar(512),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portalNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`activityDescription` text,
	`budgetHours` decimal(9,2) NOT NULL,
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('planning','active','paused','complete') NOT NULL DEFAULT 'planning',
	`taskBrief` text,
	`seniorGuidance` text,
	`exampleContent` text,
	`stepsJson` text,
	`linksJson` text,
	`resourcesJson` text,
	`assignedSeniorId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whsComplianceActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complianceItemId` int NOT NULL,
	`assignedTo` int NOT NULL,
	`actionType` enum('review','draft','complete','amend') NOT NULL,
	`instructions` text NOT NULL,
	`dueDate` timestamp,
	`status` enum('requested','in_progress','complete','overdue') NOT NULL DEFAULT 'requested',
	`requestedBy` int NOT NULL,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whsComplianceActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whsComplianceItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(160) NOT NULL,
	`requirement` varchar(500) NOT NULL,
	`reference` varchar(255),
	`complianceRequirement` text,
	`evidence` text,
	`responsiblePosition` varchar(255),
	`responsibleUserId` int,
	`reviewFrequency` varchar(120),
	`nextReviewDate` timestamp,
	`status` enum('compliant','attention','overdue','not_started') NOT NULL DEFAULT 'not_started',
	`riskLevel` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whsComplianceItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `clientContactName` varchar(255);--> statement-breakpoint
ALTER TABLE `projects` ADD `clientContactEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `projects` ADD `clientContactPhone` varchar(64);--> statement-breakpoint
ALTER TABLE `projects` ADD `sharepointUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `projects` ADD `startDate` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `endDate` timestamp;--> statement-breakpoint
ALTER TABLE `projects` ADD `budgetHours` decimal(9,2);--> statement-breakpoint
ALTER TABLE `projects` ADD `budgetAmount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `timesheetEntries` ADD `activityId` int;