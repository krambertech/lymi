CREATE TABLE `deck_preferences` (
	`deck_id` text NOT NULL,
	`user_id` text NOT NULL,
	`front_pronunciation` text DEFAULT 'until-known' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`deck_id`, `user_id`),
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `deck_preferences_user_idx` ON `deck_preferences` (`user_id`);