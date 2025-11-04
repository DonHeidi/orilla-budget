CREATE TABLE `time_sheet_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`time_sheet_id` text NOT NULL,
	`time_entry_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`time_sheet_id`) REFERENCES `time_sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`time_entry_id`) REFERENCES `time_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `time_sheets` (
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
	`project_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
