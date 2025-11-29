CREATE TABLE `entry_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`time_entry_id` text NOT NULL,
	`author_id` text NOT NULL,
	`content` text NOT NULL,
	`parent_message_id` text,
	`status_change` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`time_entry_id`) REFERENCES `time_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_approval_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`approval_mode` text DEFAULT 'required' NOT NULL,
	`auto_approve_after_days` integer DEFAULT 0 NOT NULL,
	`require_all_entries_approved` integer DEFAULT true NOT NULL,
	`allow_self_approve_no_client` integer DEFAULT false NOT NULL,
	`approval_stages` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_approval_settings_project_id_unique` ON `project_approval_settings` (`project_id`);--> statement-breakpoint
CREATE TABLE `time_sheet_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`time_sheet_id` text NOT NULL,
	`stage` text NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`time_sheet_id`) REFERENCES `time_sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `time_entries` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `status_changed_at` text;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `status_changed_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `time_entries` ADD `last_edited_at` text;--> statement-breakpoint
ALTER TABLE `time_entries` ADD `created_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `time_sheet_entries` ADD `entry_last_edited_at_when_added` text;--> statement-breakpoint
ALTER TABLE `time_sheet_entries` ADD `approved_in_sheet` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `time_sheet_entries` ADD `approved_in_sheet_at` text;--> statement-breakpoint
ALTER TABLE `time_sheet_entries` ADD `approved_in_sheet_by` text REFERENCES users(id);