CREATE TABLE `Checkin` (
	`id` text PRIMARY KEY NOT NULL,
	`habitId` text NOT NULL,
	`date` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`habitId`) REFERENCES `Habit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Checkin_habitId_date_idx` ON `Checkin` (`habitId`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `Checkin_habitId_date_unique` ON `Checkin` (`habitId`,`date`);--> statement-breakpoint
CREATE TABLE `Habit` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'droplets',
	`color` text DEFAULT 'orange',
	`period` text DEFAULT 'daily' NOT NULL,
	`frequency` integer DEFAULT 1 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`archivedAt` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Habit_userId_idx` ON `Habit` (`userId`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`clerkId` text NOT NULL,
	`email` text NOT NULL,
	`weekStart` text DEFAULT 'monday' NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_clerkId_unique` ON `User` (`clerkId`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);