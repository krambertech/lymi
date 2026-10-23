CREATE TABLE `apple_revocations` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	`client` text NOT NULL,
	`token` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`created_at` integer NOT NULL,
	`settled_at` integer
);
--> statement-breakpoint
CREATE INDEX `apple_revocations_due_idx` ON `apple_revocations` (`status`,`next_attempt_at`);