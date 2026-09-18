CREATE TABLE `publication_media` (
	`id` text PRIMARY KEY NOT NULL,
	`publication_id` text NOT NULL,
	`card_id` text NOT NULL,
	`kind` text NOT NULL,
	`image_id` text,
	`audio_key` text,
	`approved_by` text NOT NULL,
	`approved_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`publication_id`) REFERENCES `deck_publications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`image_id`) REFERENCES `card_images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "publication_media_asset_check" CHECK(("publication_media"."kind" = 'image' and "publication_media"."image_id" is not null and "publication_media"."audio_key" is null) or ("publication_media"."kind" = 'audio' and "publication_media"."image_id" is null and "publication_media"."audio_key" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_media_active_idx` ON `publication_media` (`publication_id`,`card_id`,`kind`) WHERE revoked_at is null;--> statement-breakpoint
CREATE INDEX `publication_media_publication_idx` ON `publication_media` (`publication_id`,`card_id`);