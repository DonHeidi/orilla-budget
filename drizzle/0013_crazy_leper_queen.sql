PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE IF EXISTS `organisations`;--> statement-breakpoint
DROP TABLE IF EXISTS `project_members`;--> statement-breakpoint
DROP TABLE IF EXISTS `projects`;--> statement-breakpoint
DROP TABLE IF EXISTS `sessions`;--> statement-breakpoint
DROP TABLE IF EXISTS `users`;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`organisation_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'contact' NOT NULL,
	`access_code` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organisation_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_accounts`("id", "user_id", "organisation_id", "name", "email", "role", "access_code", "created_at") SELECT "id", "user_id", "organisation_id", "name", "email", "role", "access_code", "created_at" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_access_code_unique` ON `accounts` (`access_code`);--> statement-breakpoint
CREATE TABLE `__new_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`user_id` text,
	`pii_id` text,
	`email` text NOT NULL,
	`organisation_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`pii_id`) REFERENCES `pii`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`organisation_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_contacts`("id", "owner_id", "user_id", "pii_id", "email", "organisation_id", "created_at") SELECT "id", "owner_id", "user_id", "pii_id", "email", "organisation_id", "created_at" FROM `contacts`;--> statement-breakpoint
DROP TABLE `contacts`;--> statement-breakpoint
ALTER TABLE `__new_contacts` RENAME TO `contacts`;--> statement-breakpoint
CREATE TABLE `__new_entry_messages` (
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
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_entry_messages`("id", "time_entry_id", "author_id", "content", "parent_message_id", "status_change", "created_at", "updated_at", "deleted_at") SELECT "id", "time_entry_id", "author_id", "content", "parent_message_id", "status_change", "created_at", "updated_at", "deleted_at" FROM `entry_messages`;--> statement-breakpoint
DROP TABLE `entry_messages`;--> statement-breakpoint
ALTER TABLE `__new_entry_messages` RENAME TO `entry_messages`;--> statement-breakpoint
CREATE TABLE `__new_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`project_id` text,
	`role` text,
	`code` text NOT NULL,
	`expires_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_invitations`("id", "contact_id", "invited_by_user_id", "project_id", "role", "code", "expires_at", "status", "created_at") SELECT "id", "contact_id", "invited_by_user_id", "project_id", "role", "code", "expires_at", "status", "created_at" FROM `invitations`;--> statement-breakpoint
DROP TABLE `invitations`;--> statement-breakpoint
ALTER TABLE `__new_invitations` RENAME TO `invitations`;--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_code_unique` ON `invitations` (`code`);--> statement-breakpoint
CREATE TABLE `__new_project_approval_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`approval_mode` text DEFAULT 'required' NOT NULL,
	`auto_approve_after_days` integer DEFAULT 0 NOT NULL,
	`require_all_entries_approved` integer DEFAULT true NOT NULL,
	`allow_self_approve_no_client` integer DEFAULT false NOT NULL,
	`approval_stages` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_project_approval_settings`("id", "project_id", "approval_mode", "auto_approve_after_days", "require_all_entries_approved", "allow_self_approve_no_client", "approval_stages", "created_at", "updated_at") SELECT "id", "project_id", "approval_mode", "auto_approve_after_days", "require_all_entries_approved", "allow_self_approve_no_client", "approval_stages", "created_at", "updated_at" FROM `project_approval_settings`;--> statement-breakpoint
DROP TABLE `project_approval_settings`;--> statement-breakpoint
ALTER TABLE `__new_project_approval_settings` RENAME TO `project_approval_settings`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_approval_settings_project_id_unique` ON `project_approval_settings` (`project_id`);--> statement-breakpoint
CREATE TABLE `__new_time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by_user_id` text,
	`project_id` text,
	`organisation_id` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`hours` real NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`status_changed_at` text,
	`status_changed_by` text,
	`last_edited_at` text,
	`created_by` text,
	`approved_date` text,
	`billed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organisation_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`status_changed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_time_entries`("id", "created_by_user_id", "project_id", "organisation_id", "title", "description", "hours", "date", "status", "status_changed_at", "status_changed_by", "last_edited_at", "created_by", "approved_date", "billed", "created_at") SELECT "id", "created_by_user_id", "project_id", "organisation_id", "title", "description", "hours", "date", "status", "status_changed_at", "status_changed_by", "last_edited_at", "created_by", "approved_date", "billed", "created_at" FROM `time_entries`;--> statement-breakpoint
DROP TABLE `time_entries`;--> statement-breakpoint
ALTER TABLE `__new_time_entries` RENAME TO `time_entries`;--> statement-breakpoint
CREATE TABLE `__new_time_sheet_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`time_sheet_id` text NOT NULL,
	`stage` text NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`time_sheet_id`) REFERENCES `time_sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_time_sheet_approvals`("id", "time_sheet_id", "stage", "approved_by", "approved_at", "notes") SELECT "id", "time_sheet_id", "stage", "approved_by", "approved_at", "notes" FROM `time_sheet_approvals`;--> statement-breakpoint
DROP TABLE `time_sheet_approvals`;--> statement-breakpoint
ALTER TABLE `__new_time_sheet_approvals` RENAME TO `time_sheet_approvals`;--> statement-breakpoint
CREATE TABLE `__new_time_sheet_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`time_sheet_id` text NOT NULL,
	`time_entry_id` text NOT NULL,
	`entry_last_edited_at_when_added` text,
	`approved_in_sheet` integer DEFAULT false NOT NULL,
	`approved_in_sheet_at` text,
	`approved_in_sheet_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`time_sheet_id`) REFERENCES `time_sheets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`time_entry_id`) REFERENCES `time_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_in_sheet_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_time_sheet_entries`("id", "time_sheet_id", "time_entry_id", "entry_last_edited_at_when_added", "approved_in_sheet", "approved_in_sheet_at", "approved_in_sheet_by", "created_at") SELECT "id", "time_sheet_id", "time_entry_id", "entry_last_edited_at_when_added", "approved_in_sheet", "approved_in_sheet_at", "approved_in_sheet_by", "created_at" FROM `time_sheet_entries`;--> statement-breakpoint
DROP TABLE `time_sheet_entries`;--> statement-breakpoint
ALTER TABLE `__new_time_sheet_entries` RENAME TO `time_sheet_entries`;--> statement-breakpoint
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
	`project_id` text,
	`account_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_time_sheets`("id", "title", "description", "start_date", "end_date", "status", "submitted_date", "approved_date", "rejected_date", "rejection_reason", "organisation_id", "project_id", "account_id", "created_at", "updated_at") SELECT "id", "title", "description", "start_date", "end_date", "status", "submitted_date", "approved_date", "rejected_date", "rejection_reason", "organisation_id", "project_id", "account_id", "created_at", "updated_at" FROM `time_sheets`;--> statement-breakpoint
DROP TABLE `time_sheets`;--> statement-breakpoint
ALTER TABLE `__new_time_sheets` RENAME TO `time_sheets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;