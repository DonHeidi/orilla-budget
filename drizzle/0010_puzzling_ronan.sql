PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organisation_id` text,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text DEFAULT 'budget' NOT NULL,
	`budget_hours` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "organisation_id", "name", "description", "category", "budget_hours", "created_at") SELECT "id", "organisation_id", "name", "description", "category", "budget_hours", "created_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `created_by_user_id` text REFERENCES users(id);