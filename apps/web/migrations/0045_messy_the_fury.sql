CREATE TABLE `analytics_review_starts` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`first_review_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `analytics_consent` integer;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `analytics_consent_updated_at` integer;