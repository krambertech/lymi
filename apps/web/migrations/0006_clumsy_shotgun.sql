CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`expiration_time` integer,
	`reminder_time` text DEFAULT '19:00' NOT NULL,
	`timezone` text NOT NULL,
	`last_sent_local_date` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_idx` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_beta_signups` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`source` text DEFAULT 'landing' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_beta_signups`("id", "email", "source", "created_at") SELECT lower(hex(randomblob(10))), "email", 'landing', "created_at" FROM `beta_signups`;--> statement-breakpoint
DROP TABLE `beta_signups`;--> statement-breakpoint
ALTER TABLE `__new_beta_signups` RENAME TO `beta_signups`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `beta_signups_email_idx` ON `beta_signups` (`email`);
