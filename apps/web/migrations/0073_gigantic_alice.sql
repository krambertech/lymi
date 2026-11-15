CREATE TABLE `learner_openings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`opened_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `learner_openings` (`user_id`, `opened_at`) SELECT `user_id`, max(`updated_at`) FROM `session` GROUP BY `user_id`;
