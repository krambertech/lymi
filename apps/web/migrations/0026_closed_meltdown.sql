ALTER TABLE `deck_invitations` ADD `email` text;--> statement-breakpoint
ALTER TABLE `deck_invitations` ADD `accepted_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `deck_invitations_active_named_idx` ON `deck_invitations` (`deck_id`,`email`) WHERE kind = 'named' and revoked_at is null and accepted_at is null;--> statement-breakpoint
CREATE INDEX `deck_invitations_deck_idx` ON `deck_invitations` (`deck_id`,`kind`);