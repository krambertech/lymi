ALTER TABLE `cards` ADD `audio_source` text;--> statement-breakpoint
-- Every clip stored before this column was generated speech. Idempotent.
UPDATE `cards` SET `audio_source` = 'generated' WHERE `audio_key` IS NOT NULL AND `audio_source` IS NULL;
