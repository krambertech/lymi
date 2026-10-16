-- The account that holds decks other people study after their owner deleted theirs. It has no
-- credentials, so nobody signs in as it, and seeding it here keeps its address from being taken.
INSERT OR IGNORE INTO `user` (`id`, `name`, `email`, `email_verified`)
VALUES ('former-owner', '', 'former-owner@lymi.invalid', 0);
