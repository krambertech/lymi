CREATE TABLE `deck_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`summary` text NOT NULL,
	`level` text,
	`meaning_language` text NOT NULL,
	`publisher` text NOT NULL,
	`sources` text NOT NULL,
	`reviewed_at` integer,
	`revision` integer DEFAULT 1 NOT NULL,
	`published_at` integer NOT NULL,
	`withdrawn_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_publications_deck_idx` ON `deck_publications` (`deck_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `deck_publications_slug_idx` ON `deck_publications` (`slug`);