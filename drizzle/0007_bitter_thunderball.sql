ALTER TABLE `UserSettings` ADD `dayStartHour` integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE `User` ADD `dayStartHour` integer DEFAULT 24 NOT NULL;