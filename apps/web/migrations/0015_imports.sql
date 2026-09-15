CREATE TABLE `imports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`file_name` text NOT NULL,
	`byte_size` integer NOT NULL,
	`status` text DEFAULT 'uploading' NOT NULL,
	`failure` text,
	`object_key` text,
	`upload_id` text,
	`parts` text,
	`summary` text,
	`chunks` integer DEFAULT 0 NOT NULL,
	`choices` text,
	`counts` text,
	`written` integer DEFAULT 0 NOT NULL,
	`created_by` text NOT NULL,
	`finished_at` integer,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `imports_user_idx` ON `imports` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `cards` ADD `import_id` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `external_id` text;--> statement-breakpoint
CREATE INDEX `cards_user_external_idx` ON `cards` (`user_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `cards_import_idx` ON `cards` (`import_id`,`archived_at`);--> statement-breakpoint
ALTER TABLE `decks` ADD `import_id` text;--> statement-breakpoint
ALTER TABLE `decks` ADD `external_id` text;--> statement-breakpoint
CREATE INDEX `decks_user_external_idx` ON `decks` (`user_id`,`external_id`);