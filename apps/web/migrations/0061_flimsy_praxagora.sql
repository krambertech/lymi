CREATE TABLE `content_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text,
	`owner_id` text,
	`deck_id` text,
	`card_id` text,
	`target` text NOT NULL,
	`via` text NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`snapshot` text NOT NULL,
	`local_date` text NOT NULL,
	`resolved_at` integer,
	`action` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_reports_open_idx` ON `content_reports` (`resolved_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_reports_reporter_day_idx` ON `content_reports` (`reporter_id`,`local_date`);--> statement-breakpoint
CREATE INDEX `content_reports_deck_idx` ON `content_reports` (`deck_id`,`action`);--> statement-breakpoint
CREATE INDEX `content_reports_card_idx` ON `content_reports` (`card_id`,`action`);--> statement-breakpoint
CREATE INDEX `content_reports_owner_idx` ON `content_reports` (`owner_id`);--> statement-breakpoint
CREATE TABLE `sharing_suspensions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`report_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`report_id`) REFERENCES `content_reports`(`id`) ON UPDATE no action ON DELETE set null
);
