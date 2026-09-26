CREATE INDEX "pr_commits_pr_id_idx" ON "pr_commits" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "pr_files_pr_id_idx" ON "pr_files" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "findings_review_id_idx" ON "findings" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "reviews_pr_kind_created_idx" ON "reviews" USING btree ("pr_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "agent_runs_ws_pr_status_idx" ON "agent_runs" USING btree ("workspace_id","pr_id","status");