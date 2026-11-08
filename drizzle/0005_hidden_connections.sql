-- Hand-edited: drizzle-kit omitted the ON DELETE clause for an added SQLite column.
ALTER TABLE `connections` ADD `reveal_id` text REFERENCES reveals(id) ON DELETE set null;
