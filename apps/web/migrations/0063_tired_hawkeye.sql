CREATE TABLE `apple_revocations` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	`client` text NOT NULL,
	`token` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`created_at` integer NOT NULL,
	`settled_at` integer
);
--> statement-breakpoint
CREATE INDEX `apple_revocations_due_idx` ON `apple_revocations` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `deck_copy_ids` (
	`old_id` text NOT NULL,
	`user_id` text NOT NULL,
	`new_id` text NOT NULL,
	PRIMARY KEY(`old_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `former_deck_copies` (
	`deck_id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
