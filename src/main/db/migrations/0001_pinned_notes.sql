ALTER TABLE `notes` ADD `pinned_at` integer;--> statement-breakpoint
CREATE INDEX `notes_pinned` ON `notes` (`pinned_at`) WHERE pinned_at IS NOT NULL AND deleted_at IS NULL;