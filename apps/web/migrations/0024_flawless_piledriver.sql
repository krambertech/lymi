CREATE TABLE `publication_media` (
	`id` text PRIMARY KEY NOT NULL,
	`publication_id` text NOT NULL,
	`card_id` text NOT NULL,
	`kind` text NOT NULL,
	`image_id` text,
	`audio_key` text,
	`rights_basis` text NOT NULL,
	`rights_reference` text,
	`approved_by` text NOT NULL,
	`approved_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`publication_id`) REFERENCES `deck_publications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`image_id`) REFERENCES `card_images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_media_active_idx` ON `publication_media` (`publication_id`,`card_id`,`kind`) WHERE revoked_at is null;--> statement-breakpoint
CREATE INDEX `publication_media_publication_idx` ON `publication_media` (`publication_id`,`card_id`);