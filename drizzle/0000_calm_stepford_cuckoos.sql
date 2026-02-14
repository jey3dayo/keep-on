CREATE TABLE "Checkin" (
	"id" text PRIMARY KEY NOT NULL,
	"habitId" text NOT NULL,
	"date" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Habit" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'droplets',
	"color" text DEFAULT 'orange',
	"period" text DEFAULT 'daily' NOT NULL,
	"frequency" integer DEFAULT 1 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"archivedAt" timestamp with time zone,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"weekStart" text DEFAULT 'monday' NOT NULL,
	"colorTheme" text DEFAULT 'teal' NOT NULL,
	"themeMode" text DEFAULT 'system' NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"clerkId" text NOT NULL,
	"email" text NOT NULL,
	"weekStart" text DEFAULT 'monday' NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Checkin" ADD CONSTRAINT "Checkin_habitId_Habit_id_fk" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Checkin_habitId_date_idx" ON "Checkin" USING btree ("habitId","date");--> statement-breakpoint
CREATE UNIQUE INDEX "Checkin_habitId_date_unique" ON "Checkin" USING btree ("habitId","date");--> statement-breakpoint
CREATE INDEX "Habit_userId_idx" ON "Habit" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "UserSettings_userId_unique" ON "UserSettings" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_clerkId_unique" ON "User" USING btree ("clerkId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_email_unique" ON "User" USING btree ("email");