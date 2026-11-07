CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`label` text NOT NULL,
	`reverse_label` text,
	`one_way` integer DEFAULT false NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `connections_from_id_idx` ON `connections` (`from_id`);--> statement-breakpoint
CREATE INDEX `connections_to_id_idx` ON `connections` (`to_id`);