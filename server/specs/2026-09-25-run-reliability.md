# Spec: Runs, pull-request sync and settings stay consistent when something fails

| | |
|---|---|
| **Spec ID** | SPEC-2026-09-25-run-reliability |
| **Status** | draft |
| **Source** | Phase 1 (server) of the whole-project audit of 2026-09-25 |

## Problem & why

The audit found eight places where a failure, a cancellation or a slow network leaves the server
saying something that is not true — and in most of them the user sees the lie rather than an error.

- A review run is saved in several independent steps. A failure between them leaves a review with a
  score and no findings, which the pull-request list then presents as that agent's verdict.
- A run the user cancelled is overwritten as finished when the model answers, and its findings are
  kept.
- A pull request with more than a hundred files or commits is silently cut to a hundred, and the
  review examines only part of it.
- Posting a comment, a review or a pull request to GitHub is retried after GitHub may already have
  accepted it, which posts it twice.
- Opening a pull request rewrites its stored files by deleting them first; a failure after the
  delete shows an empty diff, and a review that runs at that moment reviews nothing.
- A live-log stream is never closed when the reader leaves or when the run is unknown, and the
  in-memory log of every run is kept for the life of the process.
- Testing a new key in settings saves it before testing it, so a typo replaces a working key.
- A background job that times out keeps running, jobs interrupted by a restart stay "running"
  forever, and the recorded number of attempts is overwritten.

## Goals / Non-goals

**Goals**

- A run's outcome is saved completely or not at all, and a cancelled run stays cancelled.
- A review sees every file of the pull request.
- A write to GitHub is sent once.
- Stored pull-request detail is either the old version or the new one, never a half-written one.
- Live-log streams end, and the server forgets finished runs.
- A key is saved only once it has been shown to work.
- A job's status, attempts and timeout mean what they say.

**Non-goals**

- Deduplicating a GitHub write that failed with an ambiguous error. The write is not retried; the
  user sees the failure and decides.
- Stopping a model call that is already in flight when a run is cancelled. The call finishes; its
  result is discarded (AC-2).
- Making every job handler honour cancellation. The clone job does; others receive the signal and
  may adopt it later.

## Acceptance criteria (EARS)

**Saving a run**

- **AC-1** — WHEN a run finishes, the system SHALL save its review, its findings, the reviewed
  commit and its finished status together, or none of them.
  _(observable: forcing the findings write to fail leaves no review for that run and the run still
  marked running until the failure is recorded)_
- **AC-2** — IF a run was cancelled before its outcome is saved, THEN the system SHALL keep it
  cancelled and SHALL NOT save its review or findings.
  _(observable: a run cancelled while the model answers stays `cancelled` and has no review)_

**GitHub**

- **AC-3** — WHEN the detail of a pull request is fetched, the system SHALL retrieve all of its
  files and commits, however many pages GitHub splits them across.
  _(observable: a pull request with 150 files yields 150 files)_
- **AC-4** — The system SHALL send a comment, a review or a new pull request to GitHub at most once
  per request, even when GitHub answers with a server error.
  _(observable: a 502 on posting a comment is reported to the caller after exactly one attempt)_

**Stored pull-request detail**

- **AC-5** — WHEN fresh detail arrives from GitHub, the system SHALL replace the stored files and
  commits in one step.
  _(observable: a write that fails part-way leaves the previously stored files in place)_
- **AC-6** — IF GitHub cannot be reached, THEN the system SHALL serve the stored detail; IF storing
  fresh detail fails, THEN the system SHALL report an error rather than present it as offline.
  _(observable: GitHub unreachable → 200 with stored files; storage failure → 500)_

**Live logs**

- **AC-7** — The system SHALL answer 404 to a live-log request for a run that does not exist in the
  caller's workspace.
- **AC-8** — WHEN a live-log request is for a run that is no longer running in this process, the
  system SHALL end the stream at once.
  _(observable: requesting the log of a finished run returns promptly instead of hanging)_
- **AC-9** — WHEN the reader disconnects, or the server shuts down, the system SHALL end the stream
  and release what it held for that reader.
- **AC-10** — The system SHALL forget a finished run's in-memory log a bounded time after it
  finished, and SHALL NOT recreate it when something reports on the run later.
  _(observable: five minutes after completion the run is unknown to the in-memory log)_

**Settings**

- **AC-11** — WHEN a key is tested, the system SHALL test it without saving it, and SHALL save it
  only if the test succeeds.
  _(observable: testing a wrong key leaves the previously working key in place)_

**Background jobs**

- **AC-12** — WHEN a job exceeds its time limit, the system SHALL signal the job to stop and SHALL
  mark it failed.
  _(observable: a job that never finishes receives the stop signal and ends up `failed`)_
- **AC-13** — The system SHALL record the number of attempts a job took.
  _(observable: a job that fails once and then succeeds is `done` with 2 attempts)_
- **AC-14** — WHEN the server starts, the system SHALL mark jobs left queued or running by a
  previous process as failed with a reason saying they were interrupted.

## Edge cases

| Case | Handling |
|---|---|
| A run is cancelled after its outcome is saved | It stays finished; cancel is a no-op on a finished run |
| A live-log request arrives before the run publishes its first line | Streamed normally: a run that is running in the database is live |
| The server restarted during a run | The run was marked failed on boot, so its log request ends at once (AC-8) |
| A key is tested with no key supplied | The stored key is tested; nothing is saved |
| GitHub returns no files | Stored files are replaced by none — the pull request now has none |

## Non-functional

- No schema change, no migration, no new dependency.
- The `pnpm arch` gate stays green; the pull-request detail read gains its own repository and
  service instead of querying from the route.

## Contracts

The clone options of the git port gain an optional stop signal. It is added to both vendored copies
of the port so they stay alike; the client does not use it.

## Untrusted inputs

None new. GitHub responses are paged through, not trusted for their count.
