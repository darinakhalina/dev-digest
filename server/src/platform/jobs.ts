import PQueue from 'p-queue';
import { eq, inArray } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db } from '../db/client.js';
import * as t from '../db/schema.js';
import { withTimeout, withRetry } from './resilience.js';


export type JobHandler<T> = (payload: T, ctx: { jobId: string; signal: AbortSignal }) => Promise<void>;

interface RegisteredHandler {
  schema: z.ZodType<unknown>;
  handler: JobHandler<unknown>;
}

export interface JobRunnerOptions {
  concurrency?: number;
  timeoutMs?: number;
  retries?: number;
}

export interface EnqueuedJob {
  id: string;
  /** Resolves when the job finishes (or rejects if it ultimately fails). */
  done: Promise<void>;
}

export class JobRunner {
  private queue: PQueue;
  private handlers = new Map<string, RegisteredHandler>();
  private timeoutMs: number;
  private retries: number;

  constructor(
    private db: Db,
    opts: JobRunnerOptions = {},
  ) {
    this.queue = new PQueue({ concurrency: opts.concurrency ?? 3 });
    this.timeoutMs = opts.timeoutMs ?? 120_000;
    this.retries = opts.retries ?? 2;
  }

  register<T>(kind: string, schema: z.ZodType<T>, handler: JobHandler<T>): void {
    this.handlers.set(kind, { schema, handler: handler as JobHandler<unknown> });
  }

  async enqueue(workspaceId: string, kind: string, payload: unknown): Promise<EnqueuedJob> {
    const registered = this.handlers.get(kind);
    if (!registered) throw new Error(`No job handler registered for kind '${kind}'`);
    const parsed = registered.schema.parse(payload);

    const [row] = await this.db
      .insert(t.jobs)
      .values({ workspaceId, kind, payload: parsed as object, status: 'queued' })
      .returning({ id: t.jobs.id });
    const jobId = row!.id;

    const done = this.queue.add(async () => {
      await this.db
        .update(t.jobs)
        .set({ status: 'running', startedAt: new Date() })
        .where(eq(t.jobs.id, jobId));
      let attempts = 0;
      try {
        await withRetry(
          async () => {
            attempts += 1;
            const controller = new AbortController();
            try {
              await withTimeout(
                registered.handler(parsed, { jobId, signal: controller.signal }),
                this.timeoutMs,
              );
            } catch (err) {
              controller.abort(err);
              throw err;
            }
          },
          {
            retries: this.retries,
            onRetry: async (attempt) => {
              await this.db
                .update(t.jobs)
                .set({ attempts: attempt })
                .where(eq(t.jobs.id, jobId));
            },
          },
        );
        await this.db
          .update(t.jobs)
          .set({ status: 'done', attempts, finishedAt: new Date() })
          .where(eq(t.jobs.id, jobId));
      } catch (err) {
        await this.db
          .update(t.jobs)
          .set({
            status: 'failed',
            attempts,
            finishedAt: new Date(),
            error: (err as Error).message,
          })
          .where(eq(t.jobs.id, jobId));
        throw err;
      }
    }) as Promise<void>;

    return { id: jobId, done };
  }

  async reapInterrupted(): Promise<number> {
    const rows = await this.db
      .update(t.jobs)
      .set({ status: 'failed', finishedAt: new Date(), error: 'Interrupted by a server restart' })
      .where(inArray(t.jobs.status, ['queued', 'running']))
      .returning({ id: t.jobs.id });
    return rows.length;
  }

  /** Wait for the queue to drain (useful in tests). */
  async onIdle(): Promise<void> {
    await this.queue.onIdle();
  }
}
