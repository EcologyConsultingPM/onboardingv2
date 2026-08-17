CREATE TABLE `whsDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`documentType` enum('risk_assessment','premobilisation','swms','psychosocial') NOT NULL,
	`title` varchar(255) NOT NULL,
	`projectName` varchar(255),
	`inputJson` text NOT NULL,
	`draftJson` text NOT NULL,
	`aiModel` varchar(120) NOT NULL,
	`status` enum('draft','ready_for_review','approved') NOT NULL DEFAULT 'draft',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whsDrafts_id` PRIMARY KEY(`id`)
);
