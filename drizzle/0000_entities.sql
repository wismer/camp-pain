CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text,
	`attributes` text NOT NULL,
	`parent_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entities_slug_unique` ON `entities` (`slug`);--> statement-breakpoint
CREATE INDEX `entities_parent_id_idx` ON `entities` (`parent_id`);--> statement-breakpoint
CREATE INDEX `entities_type_idx` ON `entities` (`type`);