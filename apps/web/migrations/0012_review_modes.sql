ALTER TABLE `card_states` ADD `mode` text;--> statement-breakpoint
CREATE UNIQUE INDEX `card_states_card_user_mode_idx` ON `card_states` (`card_id`,`user_id`,`mode`);--> statement-breakpoint
ALTER TABLE `reviews` ADD `mode` text;