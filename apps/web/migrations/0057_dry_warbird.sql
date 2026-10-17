CREATE TABLE `card_corrections` (
	`card_id` text NOT NULL,
	`field` text NOT NULL,
	`user_id` text NOT NULL,
	`ai_text` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`card_id`, `field`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_corrections_user_idx` ON `card_corrections` (`user_id`,`created_at`);