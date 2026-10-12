ALTER TABLE `cards` ADD `notes_source` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `enrichment_fields` text;--> statement-breakpoint
ALTER TABLE `decks` ADD `enrich_fields` text;--> statement-breakpoint
ALTER TABLE `decks` ADD `enrich_instructions` text;