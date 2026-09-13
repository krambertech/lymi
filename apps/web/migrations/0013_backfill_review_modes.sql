-- Canonical review modes for rows written before 0012 added the mode columns. ADR 0014.
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
