CREATE TABLE `card_localizations` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`term` text,
	`meaning` text,
	`pronunciation` text,
	`example` text,
	`notes` text,
	`language` text NOT NULL,
	`provenance` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_revision` integer NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_localizations_idx` ON `card_localizations` (`card_id`,`language`);--> statement-breakpoint
CREATE INDEX `card_localizations_language_idx` ON `card_localizations` (`language`,`status`);--> statement-breakpoint
CREATE TABLE `deck_editions` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`language` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`withdrawn_at` integer,
	`published_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`published_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_editions_deck_language_idx` ON `deck_editions` (`deck_id`,`language`);--> statement-breakpoint
CREATE INDEX `deck_editions_language_idx` ON `deck_editions` (`language`,`status`);--> statement-breakpoint
CREATE TABLE `deck_localizations` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`name` text,
	`description` text,
	`summary` text,
	`language` text NOT NULL,
	`provenance` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_revision` integer NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_localizations_idx` ON `deck_localizations` (`deck_id`,`language`);--> statement-breakpoint
CREATE TABLE `section_localizations` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`name` text,
	`language` text NOT NULL,
	`provenance` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_revision` integer NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `section_localizations_idx` ON `section_localizations` (`section_id`,`language`);--> statement-breakpoint
CREATE TABLE `series_localizations` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`name` text,
	`language` text NOT NULL,
	`provenance` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`source_revision` integer NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_localizations_idx` ON `series_localizations` (`series_id`,`language`);--> statement-breakpoint
ALTER TABLE `cards` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `deck_members` ADD `meaning_language` text;--> statement-breakpoint
ALTER TABLE `deck_publications` ADD `edition_fields` text DEFAULT '["meaning"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `sections` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `series` ADD `revision` integer DEFAULT 1 NOT NULL;