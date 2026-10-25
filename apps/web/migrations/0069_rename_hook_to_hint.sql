-- The hook is called a hint now, in the product and under it.
ALTER TABLE `cards` RENAME COLUMN `hook` TO `hint`;--> statement-breakpoint
ALTER TABLE `cards` RENAME COLUMN `hook_source` TO `hint_source`;--> statement-breakpoint
ALTER TABLE `cards` RENAME COLUMN `hook_draft` TO `hint_draft`;--> statement-breakpoint
UPDATE `reviews` SET `aid` = 'hint' WHERE `aid` = 'hook';
