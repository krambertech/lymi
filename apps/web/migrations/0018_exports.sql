CREATE TABLE `exports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`format` text NOT NULL,
	`deck_id` text,
	`file_name` text NOT NULL,
	`status` text DEFAULT 'exporting' NOT NULL,
	`failure` text,
	`object_key` text,
	`segments` integer DEFAULT 0 NOT NULL,
	`byte_size` integer,
	`counts` text,
	`created_by` text NOT NULL,
	`finished_at` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exports_user_idx` ON `exports` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `exports_status_idx` ON `exports` (`status`,`updated_at`);