CREATE INDEX "convention_scans_repo_idx" ON "convention_scans" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "conventions_ws_repo_idx" ON "conventions" USING btree ("workspace_id","repo_id");--> statement-breakpoint
CREATE INDEX "conventions_repo_idx" ON "conventions" USING btree ("repo_id");--> statement-breakpoint
ALTER TABLE "conventions" ADD CONSTRAINT "conventions_confidence_ck" CHECK ("conventions"."confidence" between 0 and 1);