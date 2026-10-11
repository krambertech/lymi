CREATE TABLE `deck_page_views` (
	`deck_id` text NOT NULL,
	`day` text NOT NULL,
	`locale` text NOT NULL,
	`views` integer NOT NULL,
	PRIMARY KEY(`deck_id`, `day`, `locale`),
	FOREIGN KEY (`deck_id`) REFERENCES `decks`(`id`) ON UPDATE no action ON DELETE cascade
);
