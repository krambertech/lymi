CREATE TABLE `learning_emails` (
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`anchor` text NOT NULL,
	`sent_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `kind`, `anchor`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `user_settings` ADD `learning_emails` integer;