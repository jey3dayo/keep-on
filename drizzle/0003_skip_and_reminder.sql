ALTER TABLE `Habit` ADD COLUMN `reminderTime` text;
--> statement-breakpoint
CREATE TABLE `HabitSkip` (
	`id` text PRIMARY KEY NOT NULL,
	`habitId` text NOT NULL,
	`date` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`habitId`) REFERENCES `Habit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `HabitSkip_habitId_date_unique` ON `HabitSkip` (`habitId`,`date`);
--> statement-breakpoint
CREATE INDEX `HabitSkip_habitId_idx` ON `HabitSkip` (`habitId`);
