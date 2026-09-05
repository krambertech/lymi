ALTER TABLE `cards` ADD `normalized_term` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `cards_user_lang_norm_idx` ON `cards` (`user_id`,`language`,`normalized_term`);--> statement-breakpoint
-- Backfill. SQLite lower() folds ASCII only and does not collapse whitespace or normalise
-- Unicode, so this key can differ from normaliseTerm(). Run scripts/backfill-normalized-term.ts
-- after applying, and note that any edit of a card recomputes its key.
UPDATE `cards` SET `normalized_term` = lower(trim(`term`));
