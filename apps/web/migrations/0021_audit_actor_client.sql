ALTER TABLE `audit_log` ADD `actor_client` text;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `actor_client_name` text;--> statement-breakpoint
CREATE INDEX `audit_activity_idx` ON `audit_log` (`user_id`,`created_at`) WHERE entity <> 'review';