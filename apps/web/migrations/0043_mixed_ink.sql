ALTER TABLE `user_settings` ADD `onboarded_at` integer;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `learning_kind` text;--> statement-breakpoint
ALTER TABLE `user_settings` ADD `learning_language` text;--> statement-breakpoint
-- Welcome is for an account with nothing in it, so one that holds or held a deck, archived or joined, is past it.
INSERT INTO `user_settings` (`user_id`, `onboarded_at`)
SELECT `id`, unixepoch() * 1000 FROM `user`
WHERE EXISTS (SELECT 1 FROM `decks` WHERE `decks`.`user_id` = `user`.`id`)
   OR EXISTS (SELECT 1 FROM `deck_members` WHERE `deck_members`.`user_id` = `user`.`id`)
ON CONFLICT (`user_id`) DO UPDATE SET `onboarded_at` = excluded.`onboarded_at`
WHERE `user_settings`.`onboarded_at` IS NULL;
