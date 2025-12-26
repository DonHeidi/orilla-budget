CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`created_by` text,
	`organisation_id` text,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`category` text DEFAULT 'budget',
	`budget_hours` real,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organisation_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_team_id_unique` ON `project` (`team_id`);