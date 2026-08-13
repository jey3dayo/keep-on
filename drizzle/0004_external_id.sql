ALTER TABLE `User` RENAME COLUMN `clerkId` TO `externalId`;--> statement-breakpoint
DROP INDEX `User_clerkId_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `User_externalId_unique` ON `User` (`externalId`);
