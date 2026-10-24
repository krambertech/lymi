-- A publisher can now delete their account in the app: members of a deck they published get a
-- private copy before the deck goes, so the guard from migration 0028 no longer protects anything.
DROP TRIGGER IF EXISTS `user_owns_published_deck`;
