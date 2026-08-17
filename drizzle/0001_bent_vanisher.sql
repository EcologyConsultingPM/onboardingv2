CREATE TABLE `announcementAcknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`announcementId` int NOT NULL,
	`staffId` int NOT NULL,
	`acknowledgedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `announcementAcknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `announcement_staff_unique` UNIQUE(`announcementId`,`staffId`)
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`priority` enum('standard','important','urgent') NOT NULL DEFAULT 'standard',
	`acknowledgementRequired` boolean NOT NULL DEFAULT false,
	`isPublished` boolean NOT NULL DEFAULT true,
	`publishedBy` int NOT NULL,
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bostaMemos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`inputJson` text NOT NULL,
	`memoJson` text NOT NULL,
	`status` enum('draft','ready_for_review','approved') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bostaMemos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` enum('whs','swms','policy','template','resource') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(512) NOT NULL,
	`uploadedBy` int NOT NULL,
	`isPublished` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`staffId` int NOT NULL,
	`allocationRole` varchar(120) NOT NULL DEFAULT 'Project team member',
	`allocatedBy` int NOT NULL,
	`allocatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_staff_unique` UNIQUE(`projectId`,`staffId`)
);
--> statement-breakpoint
CREATE TABLE `projectUpdates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`authorId` int NOT NULL,
	`note` text NOT NULL,
	`progress` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectUpdates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectNumber` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`clientName` varchar(255),
	`description` text,
	`status` enum('planning','active','on_hold','completed') NOT NULL DEFAULT 'planning',
	`dueDate` timestamp,
	`progress` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_projectNumber_unique` UNIQUE(`projectNumber`)
);
--> statement-breakpoint
CREATE TABLE `staffRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`requestType` enum('leave','training_equipment') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`details` text NOT NULL,
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('submitted','reviewing','approved','declined','completed') NOT NULL DEFAULT 'submitted',
	`adminNote` text,
	`actionedBy` int,
	`actionedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staffRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timesheetEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`projectId` int,
	`entryDate` timestamp NOT NULL,
	`hours` decimal(5,2) NOT NULL,
	`activity` varchar(255) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timesheetEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainingCompletions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`staffId` int NOT NULL,
	`score` int,
	`passed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trainingCompletions_id` PRIMARY KEY(`id`),
	CONSTRAINT `training_staff_unique` UNIQUE(`moduleId`,`staffId`)
);
--> statement-breakpoint
CREATE TABLE `trainingModules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(120) NOT NULL DEFAULT 'General',
	`resourceName` varchar(255),
	`resourceKey` varchar(512),
	`resourceUrl` varchar(512),
	`quizJson` text,
	`isPublished` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainingModules_id` PRIMARY KEY(`id`)
);
