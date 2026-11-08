CREATE TABLE `entity_links` (
	`source_id` text NOT NULL,
	`target_id` text NOT NULL,
	PRIMARY KEY(`source_id`, `target_id`),
	FOREIGN KEY (`source_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entity_links_target_id_idx` ON `entity_links` (`target_id`);