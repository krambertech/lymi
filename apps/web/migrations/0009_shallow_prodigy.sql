CREATE TABLE `review_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`goal` integer NOT NULL,
	`timezone` text NOT NULL,
	`zero_due_confirmed_at` integer,
	`outcome` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_days_user_date_idx` ON `review_days` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `review_undos` (
	`review_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`undone_at` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `reviews` ADD `review_day_id` text REFERENCES review_days(id);--> statement-breakpoint
ALTER TABLE `reviews` ADD `state_before` text;--> statement-breakpoint
CREATE INDEX `reviews_day_idx` ON `reviews` (`review_day_id`);--> statement-breakpoint
ALTER TABLE `user_settings` ADD `daily_goal` integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `daily_goal_chosen_at` integer;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `review_timezone` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `review_timezone_mode` text DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `review_timezone_updated_at` integer;