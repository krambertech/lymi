-- Deleting an account now gives each member of its studied decks a copy first, so the 0028 guard on
-- published decks gives way to one on every deck someone else studies. The service moves those decks
-- to the former owner before the user row goes, so only a delete that skips it is refused.
DROP TRIGGER IF EXISTS `user_owns_published_deck`;
--> statement-breakpoint
CREATE TRIGGER `user_owns_studied_deck` BEFORE DELETE ON `user`
WHEN EXISTS (
	SELECT 1 FROM `decks`
	WHERE `decks`.`user_id` = OLD.`id` AND `decks`.`archived_at` IS NULL
	AND EXISTS (
		SELECT 1 FROM `deck_members`
		WHERE `deck_members`.`deck_id` = `decks`.`id` AND `deck_members`.`removed_at` IS NULL
		AND `deck_members`.`user_id` <> OLD.`id`
	)
)
BEGIN
	SELECT RAISE(ABORT, 'This account owns a deck other people study, so deleting it here would delete their progress. Delete it through the app');
END;
