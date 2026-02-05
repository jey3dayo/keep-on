CREATE TABLE `UserSettings` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`weekStart` text DEFAULT 'monday' NOT NULL,
	`colorTheme` text DEFAULT 'teal' NOT NULL,
	`themeMode` text DEFAULT 'system' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UserSettings_userId_unique` ON `UserSettings` (`userId`);