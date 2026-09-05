CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`meaning_language` text DEFAULT 'en' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `cards` ADD `created_by` text DEFAULT 'user' NOT NULL;