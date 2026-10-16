CREATE TABLE `account_deletions` (
	`id` text PRIMARY KEY NOT NULL,
	`client` text NOT NULL,
	`confirmed_with` text NOT NULL,
	`account_created_at` integer NOT NULL,
	`decks` integer NOT NULL,
	`cards` integer NOT NULL,
	`reviews` integer NOT NULL,
	`kept_decks` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
