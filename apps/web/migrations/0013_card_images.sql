CREATE TABLE `card_images` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`byte_size` integer NOT NULL,
	`description` text,
	`source_kind` text NOT NULL,
	`source_host` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_images_active_idx` ON `card_images` (`card_id`) WHERE status = 'active';--> statement-breakpoint
CREATE INDEX `card_images_card_idx` ON `card_images` (`card_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `cards` ADD `review_modes` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `image_version` text;