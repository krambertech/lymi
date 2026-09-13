CREATE TABLE `user_avatars` (
	`user_id` text PRIMARY KEY NOT NULL,
	`custom_key` text,
	`custom_version` text,
	`custom_revision` integer DEFAULT 0 NOT NULL,
	`google_key` text,
	`google_version` text,
	`google_fetched_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
