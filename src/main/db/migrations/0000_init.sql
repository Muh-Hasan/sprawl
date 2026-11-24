CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`rel_path` text NOT NULL,
	`orig_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`width` integer,
	`height` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attachments_sha256_unique` ON `attachments` (`sha256`);--> statement-breakpoint
CREATE TABLE `canvas_items` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`ref_id` text,
	`url` text,
	`title` text,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`w` real NOT NULL,
	`h` real NOT NULL,
	`z` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `canvas_items_ref` ON `canvas_items` (`kind`,`ref_id`) WHERE ref_id IS NOT NULL;--> statement-breakpoint
CREATE TABLE `drawings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'Untitled drawing' NOT NULL,
	`scene_json` text NOT NULL,
	`thumb_png` blob,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`at` integer NOT NULL,
	`kind` text NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`note_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `log_entries_day` ON `log_entries` (`day`,`at`);--> statement-breakpoint
CREATE TABLE `note_activity` (
	`note_id` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`note_id`, `day`),
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `note_links` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`url` text NOT NULL,
	`label` text,
	`position` integer NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`body_json` text DEFAULT '[]' NOT NULL,
	`body_text` text DEFAULT '' NOT NULL,
	`color` text DEFAULT 'stone' NOT NULL,
	`due_day` text,
	`due_time` text,
	`remind` text DEFAULT 'none' NOT NULL,
	`remind_at` integer,
	`reminded_at` integer,
	`done_at` integer,
	`check_total` integer DEFAULT 0 NOT NULL,
	`check_done` integer DEFAULT 0 NOT NULL,
	`attach_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `notes_remind` ON `notes` (`remind_at`) WHERE reminded_at IS NULL AND done_at IS NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX `notes_due` ON `notes` (`due_day`,`due_time`) WHERE done_at IS NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `refs` (
	`from_note_id` text NOT NULL,
	`to_kind` text NOT NULL,
	`to_id` text NOT NULL,
	PRIMARY KEY(`from_note_id`, `to_kind`, `to_id`),
	FOREIGN KEY (`from_note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
-- Hand-written (Drizzle can't express FTS5 virtual tables; drizzle-kit ignores it in diffs).
CREATE VIRTUAL TABLE `search_index` USING fts5(
	kind UNINDEXED, ref_id UNINDEXED, title, body,
	tokenize = 'unicode61 remove_diacritics 2'
);
