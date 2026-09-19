-- "ai" now names Lymi's own enrichment alone. Until this migration, text an MCP client sent
-- without a source was labelled "ai" too and carried the AI badge. A field the enrichment never
-- wrote, by the audit log, becomes the learner's; a field it did write keeps its badge.
UPDATE `cards` SET `meaning_source` = 'manual' WHERE `meaning_source` = 'ai' AND NOT EXISTS (
	SELECT 1 FROM `audit_log` WHERE `audit_log`.`entity` = 'card' AND `audit_log`.`entity_id` = `cards`.`id`
		AND `audit_log`.`actor` = 'ai' AND json_extract(`audit_log`.`payload`, '$.meaning') IS NOT NULL
);
--> statement-breakpoint
UPDATE `cards` SET `example_source` = 'manual' WHERE `example_source` = 'ai' AND NOT EXISTS (
	SELECT 1 FROM `audit_log` WHERE `audit_log`.`entity` = 'card' AND `audit_log`.`entity_id` = `cards`.`id`
		AND `audit_log`.`actor` = 'ai' AND json_extract(`audit_log`.`payload`, '$.example') IS NOT NULL
);
--> statement-breakpoint
UPDATE `cards` SET `pronunciation_source` = 'manual' WHERE `pronunciation_source` = 'ai' AND NOT EXISTS (
	SELECT 1 FROM `audit_log` WHERE `audit_log`.`entity` = 'card' AND `audit_log`.`entity_id` = `cards`.`id`
		AND `audit_log`.`actor` = 'ai' AND json_extract(`audit_log`.`payload`, '$.pronunciation') IS NOT NULL
);
