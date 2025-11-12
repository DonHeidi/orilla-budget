PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_time_sheets` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`start_date` text,
	`end_date` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_date` text,
	`approved_date` text,
	`rejected_date` text,
	`rejection_reason` text,
	`organisation_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_time_sheets`("id", "title", "description", "start_date", "end_date", "status", "submitted_date", "approved_date", "rejected_date", "rejection_reason", "organisation_id", "created_at", "updated_at") SELECT "id", "title", "description", "start_date", "end_date", "status", "submitted_date", "approved_date", "rejected_date", "rejection_reason", "organisation_id", "created_at", "updated_at" FROM `time_sheets`;--> statement-breakpoint
DROP TABLE `time_sheets`;--> statement-breakpoint
ALTER TABLE `__new_time_sheets` RENAME TO `time_sheets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;