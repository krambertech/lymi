CREATE TABLE `card_tags` (
	`card_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`card_id`, `tag_id`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `card_tags_tag_idx` ON `card_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_user_name_idx` ON `tags` (`user_id`,`normalized_name`);--> statement-breakpoint
-- Every existing tag moves into the tables; the statements match `syncTagStatements` in services/tags.ts.
INSERT INTO `tags` (`id`, `user_id`, `name`, `normalized_name`)
SELECT lower(hex(randomblob(10))), `cards`.`user_id`, max(trim(`each`.`value`)), lower(trim(`each`.`value`))
FROM `cards`, json_each(`cards`.`tags`) AS `each`
WHERE `each`.`type` = 'text' AND trim(`each`.`value`) <> ''
GROUP BY `cards`.`user_id`, lower(trim(`each`.`value`))
ON CONFLICT (`user_id`, `normalized_name`) DO NOTHING;
--> statement-breakpoint
INSERT INTO `card_tags` (`card_id`, `tag_id`, `position`)
SELECT `cards`.`id`, `tags`.`id`, min(`each`.`key`)
FROM `cards`, json_each(`cards`.`tags`) AS `each`
JOIN `tags` ON `tags`.`user_id` = `cards`.`user_id` AND `tags`.`normalized_name` = lower(trim(`each`.`value`))
WHERE `each`.`type` = 'text'
GROUP BY `cards`.`id`, `tags`.`id`
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE `cards` SET `tags` = (
  SELECT json_group_array(`tags`.`name` ORDER BY `card_tags`.`position`)
  FROM `card_tags` JOIN `tags` ON `tags`.`id` = `card_tags`.`tag_id`
  WHERE `card_tags`.`card_id` = `cards`.`id`
)
WHERE `tags` <> '[]';
