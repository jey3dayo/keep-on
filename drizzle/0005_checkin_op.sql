CREATE TABLE `CheckinOp` (
	`action` text NOT NULL,
	`createdAt` text NOT NULL,
	`habitId` text NOT NULL,
	`opId` text PRIMARY KEY NOT NULL,
	`result` text NOT NULL
);
