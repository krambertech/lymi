ALTER TABLE `cards` ADD `normalized_term` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `cards_user_lang_norm_idx` ON `cards` (`user_id`,`language`,`normalized_term`);--> statement-breakpoint
-- Backfill. SQLite lower() folds ASCII only; the app recomputes the key on the next edit of
-- any card whose term has non-ASCII capitals. Nothing in production has those yet.
UPDATE `cards` SET `normalized_term` = lower(trim(`term`));
