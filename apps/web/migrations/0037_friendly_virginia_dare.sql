ALTER TABLE `card_diagnoses` ADD `prompt_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `card_diagnoses` ADD `dismissed_at` integer;