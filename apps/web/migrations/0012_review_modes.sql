ALTER TABLE `card_states` ADD `mode` text;--> statement-breakpoint
CREATE UNIQUE INDEX `card_states_card_user_mode_idx` ON `card_states` (`card_id`,`user_id`,`mode`);--> statement-breakpoint
ALTER TABLE `reviews` ADD `mode` text;--> statement-breakpoint
-- Backfill canonical modes for existing rows. ADR 0014.
-- Idempotent: each statement touches only rows still missing a mode, so a partial or repeated run
-- converges. Schedules, due dates, ratings, timestamps and every other review fact are untouched.
UPDATE `card_states` SET `mode` = CASE `direction`
	WHEN 'recognition' THEN 'term_to_meaning'
	WHEN 'production' THEN 'meaning_to_term' END
WHERE `mode` IS NULL AND `direction` IN ('recognition', 'production');
--> statement-breakpoint
UPDATE `reviews` SET `mode` = CASE `direction`
	WHEN 'recognition' THEN 'term_to_meaning'
	WHEN 'production' THEN 'meaning_to_term' END
WHERE `mode` IS NULL AND `direction` IN ('recognition', 'production');
