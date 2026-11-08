PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entity_links` (
	`source_id` text NOT NULL,
	`source_reveal_id` text,
	`target_id` text NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_reveal_id`) REFERENCES `reveals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Hand-edited: drizzle-kit selected the new column from the old table, which lacks it.
INSERT INTO `__new_entity_links`("source_id", "source_reveal_id", "target_id") SELECT "source_id", NULL, "target_id" FROM `entity_links`;--> statement-breakpoint
DROP TABLE `entity_links`;--> statement-breakpoint
ALTER TABLE `__new_entity_links` RENAME TO `entity_links`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `entity_links_source_id_idx` ON `entity_links` (`source_id`,`source_reveal_id`);--> statement-breakpoint
CREATE INDEX `entity_links_target_id_idx` ON `entity_links` (`target_id`);