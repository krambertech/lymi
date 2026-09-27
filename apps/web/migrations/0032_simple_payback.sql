CREATE TABLE `card_diagnoses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text DEFAULT 'working' NOT NULL,
	`cause` text,
	`proposed_cause` text,
	`confidence` real,
	`draft` text,
	`model` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_diagnoses_user_card_revision_idx` ON `card_diagnoses` (`user_id`,`card_id`,`revision`);