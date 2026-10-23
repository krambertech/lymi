CREATE TABLE `readwise_books` (
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`title` text NOT NULL,
	`author` text,
	`language` text,
	`followed` integer NOT NULL,
	`pending` integer DEFAULT false NOT NULL,
	`highlights` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`user_id`, `book_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `readwise_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token_cipher` text NOT NULL,
	`token_hint` text NOT NULL,
	`status` text NOT NULL,
	`decks` text NOT NULL,
	`pulled_through` integer NOT NULL,
	`pull_cursor` text,
	`pull_cursor_from` integer,
	`next_pull_at` integer NOT NULL,
	`last_pull_at` integer,
	`last_pull_highlights` integer DEFAULT 0 NOT NULL,
	`last_pull_cards` integer DEFAULT 0 NOT NULL,
	`last_pull_skipped` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
