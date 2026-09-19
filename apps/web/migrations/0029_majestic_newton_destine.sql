ALTER TABLE `deck_members` ADD `states_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `decks` ADD `states_version` integer DEFAULT 0 NOT NULL;