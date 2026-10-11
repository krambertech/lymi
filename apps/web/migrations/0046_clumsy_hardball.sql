CREATE TABLE `important_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `important_cards_card_user_idx` ON `important_cards` (`card_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `important_cards_user_idx` ON `important_cards` (`user_id`);