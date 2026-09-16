CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`screen` text NOT NULL,
	`app_version` text NOT NULL,
	`browser` text NOT NULL,
	`language` text NOT NULL,
	`local_date` text NOT NULL,
	`delivery` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feedback_user_day_idx` ON `feedback` (`user_id`,`local_date`);