CREATE TABLE `section_starts` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`user_id` text NOT NULL,
	`how` text NOT NULL,
	`started_at` integer NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `section_starts_section_user_idx` ON `section_starts` (`section_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `section_starts_user_idx` ON `section_starts` (`user_id`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sections_deck_idx` ON `sections` (`deck_id`,`archived_at`,`position`);--> statement-breakpoint
ALTER TABLE `cards` ADD `section_id` text REFERENCES sections(id);--> statement-breakpoint
CREATE INDEX `cards_section_idx` ON `cards` (`section_id`);--> statement-breakpoint
ALTER TABLE `decks` ADD `section_progression` text DEFAULT 'automatic' NOT NULL;