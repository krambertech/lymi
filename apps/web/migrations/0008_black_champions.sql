CREATE TABLE `deck_members` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'learner' NOT NULL,
	`invitation_id` text,
	`joined_at` integer NOT NULL,
	`removed_at` integer,
	`removed_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_members_deck_user_idx` ON `deck_members` (`deck_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `deck_members_user_idx` ON `deck_members` (`user_id`,`removed_at`);--> statement-breakpoint
DROP INDEX `card_states_card_dir_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `card_states_card_user_dir_idx` ON `card_states` (`card_id`,`user_id`,`direction`);