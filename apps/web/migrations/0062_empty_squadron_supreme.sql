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
