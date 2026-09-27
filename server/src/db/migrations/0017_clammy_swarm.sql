ALTER TABLE "skills" ADD COLUMN "threat_level" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "threat_signals" jsonb;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "threat_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "threat_accepted_by" uuid;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_threat_accepted_by_users_id_fk" FOREIGN KEY ("threat_accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skills_threat_idx" ON "skills" USING btree ("workspace_id","threat_level");