-- Deleting a deck's owner cascades through the deck into every member's schedule and reviews, so
-- an account that owns a published deck, withdrawn or not, cannot be deleted. docs/data-model.md.
CREATE TRIGGER `user_owns_published_deck` BEFORE DELETE ON `user`
WHEN EXISTS (
	SELECT 1 FROM `deck_publications`
	INNER JOIN `decks` ON `decks`.`id` = `deck_publications`.`deck_id`
	WHERE `decks`.`user_id` = OLD.`id`
)
BEGIN
	SELECT RAISE(ABORT, 'This account owns a published deck, so deleting it would delete every learner''s progress in it');
END;
