CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `series_user_idx` ON `series` (`user_id`,`archived_at`,`position`);--> statement-breakpoint
ALTER TABLE `decks` ADD `series_id` text REFERENCES series(id);--> statement-breakpoint
CREATE INDEX `decks_series_idx` ON `decks` (`series_id`,`position`);