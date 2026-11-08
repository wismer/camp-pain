CREATE TABLE `reveals` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`parent_id` text,
	`branch` text DEFAULT 'success' NOT NULL,
	`check_kind` text NOT NULL,
	`check_name` text NOT NULL,
	`dc` integer,
	`success_body` text,
	`failure_body` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `reveals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reveals_entity_id_idx` ON `reveals` (`entity_id`);--> statement-breakpoint
CREATE INDEX `reveals_parent_id_idx` ON `reveals` (`parent_id`);