ALTER TABLE `card_localizations` ADD `example_translation` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `example_translation` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `example_translation_source` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `example_translation_of` text;--> statement-breakpoint
ALTER TABLE `cards` ADD `example_translation_status` text;--> statement-breakpoint
-- A deck whose owner chose to let the AI write examples translates them too; one that never chose follows its new default.
UPDATE `decks` SET `enrich_fields` = json_insert(`enrich_fields`, '$[#]', 'exampleTranslation')
WHERE `enrich_fields` IS NOT NULL
  AND EXISTS (SELECT 1 FROM json_each(`decks`.`enrich_fields`) WHERE `value` = 'example')
  AND NOT EXISTS (SELECT 1 FROM json_each(`decks`.`enrich_fields`) WHERE `value` = 'exampleTranslation');
