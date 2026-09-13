CREATE TABLE `deck_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`kind` text DEFAULT 'link' NOT NULL,
	`token` text NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_invitations_token_idx` ON `deck_invitations` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `deck_invitations_active_link_idx` ON `deck_invitations` (`deck_id`) WHERE kind = 'link' and revoked_at is null;