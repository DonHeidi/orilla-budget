CREATE TABLE `project_billing_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '',
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_member_billing_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`team_member_id` text NOT NULL,
	`billing_role_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`team_member_id`) REFERENCES `team_member`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`billing_role_id`) REFERENCES `project_billing_roles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_member_billing_roles_team_member_id_unique` ON `project_member_billing_roles` (`team_member_id`);--> statement-breakpoint
CREATE TABLE `project_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`rate_type` text NOT NULL,
	`billing_role_id` text,
	`member_id` text,
	`rate_amount_cents` integer NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`billing_role_id`) REFERENCES `project_billing_roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `team_member`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `project` ADD `fixed_price` real;--> statement-breakpoint
ALTER TABLE `project` ADD `default_hourly_rate` real;