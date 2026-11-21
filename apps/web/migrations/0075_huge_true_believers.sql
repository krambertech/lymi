ALTER TABLE `card_images` ADD `captured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `cards` ADD `example_recording_captured` integer DEFAULT false NOT NULL;