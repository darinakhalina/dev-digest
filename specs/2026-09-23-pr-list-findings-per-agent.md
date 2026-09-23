# Spec: Findings column reports every agent, not the last one to answer

| | |
|---|---|
| **Spec ID** | SPEC-2026-09-23-pr-list-findings-per-agent |
| **Status** | draft |
| **Supersedes** | SPEC-2026-09-21-pr-list-findings-column, in part: its *Which run* section and its AC-1, AC-2, AC-4 and AC-7. The rest of that spec stands |

## Problem & why

The findings column on the pull-request list reports one review. A pull request is reviewed by
one review per enabled agent, and "Review all" — the first entry in the run menu — starts all of
them at once.

The column therefore reports one agent and hides the rest, and which one it reports is decided by
nothing but which finished last. A critical security finding vanishes from the row because
another agent answered a second later. The reader sees a smaller number than the truth with
nothing to indicate that anything is missing.

This is not a shortcoming a reader can work around. The column exists so that someone can decide,
without opening the pull request, whether it needs them; a row that hides findings answers that
question wrongly.

## Goals / Non-goals

**Goals**

- Report the findings of every agent that has reviewed the pull request.
- Keep superseded work out: re-running one agent replaces that agent's answer and no one else's.
- Present the previewed findings in the same order on every load.

**Non-goals**

- Totalling every run a pull request has ever had. Only each agent's most recent review counts.
- Combining the agents' scores — see *Which runs*.
- Naming the agent behind each previewed finding. Which agent found what is answered on the
  pull-request page.
- Merging findings that two agents reported at the same place — see AC-6.
- Detecting that two agents reviewed different commits — see *Edge cases*.

## Which runs

The column reports **each agent's latest completed review, taken together**.

Three quantities on one row are aggregated three different ways, and the difference is deliberate
rather than accidental:

| Quantity | Aggregated over | Because |
|---|---|---|
| Cost | every completed run | "what has this pull request cost" — an additive question about the pull request |
| Findings | each agent's latest review | "what has been found on this pull request" — also a question about the pull request, except that an older run of an agent has already been answered by that agent's newer one |
| Score | one review | a judgement, which is neither summed nor averaged; the column shows one agent's verdict rather than an invented consensus |

The score is left as it is: the most recently completed review's. That leaves it decided by finish
order when several agents ran. This spec does not fix that, and the weakness is named here so it
is not mistaken for something this change introduced.

## User stories

- As a reviewer scanning the list, I want the row to show everything the agents found, so that one
  agent's finding is not hidden because another agent finished later.
- As a reviewer who re-runs a single agent, I want only that agent's part of the row to change, so
  that I do not lose what the others found.
- As a reviewer looking twice, I want the preview in the same order both times, so that a second
  look does not read like different data.

## Acceptance criteria (EARS)

**What the row counts**

- **AC-1** — WHILE the list is displayed, the system SHALL count, for each pull request, the
  findings of the latest completed review of each agent that has reviewed it.
  _(observable: a pull request whose security agent last found 3 and whose performance agent last
  found 2 shows counts totalling 5)_
- **AC-2** — The system SHALL NOT count a review that the same agent has since superseded.
  _(observable: an agent whose earlier review found 3 and whose latest found 1 contributes 1)_
- **AC-3** — WHEN one agent is re-run, the system SHALL change only that agent's contribution to
  the row.
  _(observable: re-running the security agent leaves every performance finding listed)_
- **AC-4** — WHERE a completed review records no agent, the system SHALL treat all such reviews as
  one further source and count the latest of them alongside the agents'.
  _(observable: a pull request whose only review predates agent attribution shows its findings
  rather than a placeholder)_
- **AC-5** — IF no agent has a completed review, or the counted reviews produced no findings
  between them, THEN the system SHALL show a placeholder mark.
- **AC-6** — The system SHALL count and list a finding from every agent that reported it, even
  when two agents cite the same file and line.
  _(observable: two agents flagging line 12 of one file give two entries and a count of 2. They
  are different findings — one may report a committed secret and the other that the signature
  scheme is not cryptographic — and merging them by position would delete one)_

**The preview**

- **AC-7** — WHEN a reader points at the icon group, the system SHALL head the panel
  `N FINDINGS`, N being the count across the counted reviews.
  _(observable: six findings head the panel `6 FINDINGS`, matching the sum of the icon counts. The
  heading names no run, because it describes more than one)_
- **AC-8** — The panel SHALL list every counted finding, ordered by descending severity, then
  descending confidence, then cited file, then cited line, then title.
  _(observable: loading the list twice gives the same order both times, including for two findings
  that share a severity and a confidence)_

**Cost of the interaction**

- **AC-9** — The system SHALL deliver every row's counts and previews in the same response that
  delivers the list, in a number of queries independent both of the row count and of the number of
  agents.
  _(observable: opening the list and every preview on it issues exactly one request)_

## Edge cases

| Case | Handling |
|---|---|
| One agent has reviewed, another never has | The row shows what the one found; an absent agent contributes nothing and is not marked |
| An agent's latest run failed | It contributes nothing — a failed run leaves no review. The failure is visible on the pull-request page's timeline, not here |
| An agent's latest run is still going | That agent's previous completed review keeps counting, unchanged, until the new one lands |
| An agent is deleted after its review | Its findings stay counted. A deleted agent does not un-find what it found, and the row describes the code, not the roster |
| Agents last ran against different commits | Counted together. Which commit a review examined is recorded nowhere, so the mixture cannot be detected. The status column already warns when the head has moved since the last review, which is where that question is answered |
| Every counted review found nothing | Placeholder, indistinguishable from never reviewed → AC-5 |
| Two identical findings from one agent | Both listed. Deduplication is not performed within an agent either |
| A review with no agent alongside real agents | Both counted → AC-4; the row shows their sum |

## Non-functional

- The response size SHALL grow with findings per review and with the number of agents that have
  reviewed a row; it SHALL NOT grow with the pull request's review history, because only each
  agent's latest review is read.
- The preview SHALL stay rendered from data the page already holds, appearing within 100 ms of the
  pointer arriving.
- The order of previewed findings SHALL be fixed entirely by AC-8, never by the order in which
  storage happens to return them.

## Cross-module interactions

- **API side** — owns which reviews are counted, the counts, and the ordering of the previews. The
  grouping changes here; the shape of the response does not.
- **Client side** — owns the heading text. Its column, icon group, panel and keyboard behaviour
  are unchanged.

## Contracts

The row member introduced by the superseded spec keeps its shape. Two of its parts change
meaning:

- **counts** — per occurring severity, the number of findings at it across the counted reviews
  rather than within one.
- **total** — the number of findings across the counted reviews. It still equals the length of the
  preview list.

The preview list itself is unchanged: same entries, same fields, no agent name among them.

## Untrusted inputs

No new class. The panel already renders model output derived from pull-request diff content, which
an author outside this repository controls, and the superseded spec's protections continue to
apply: plain text only, descriptions abbreviated, the cited path not a link.

One thing changes in degree. A row can now carry several agents' output at once, so the volume of
untrusted text on the list grows with the number of agents. The per-description limit bounds each
entry and no entry is exempt, so the growth is linear in entries rather than unbounded in any one
of them.

## Open questions

None.
