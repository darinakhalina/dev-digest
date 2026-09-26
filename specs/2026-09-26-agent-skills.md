# Skills for review agents

Cross-package: `server`, `client`, `reviewer-core`.

## Problem & why

An agent's only lever today is its system prompt. Two reviewers that should share one rule — a
severity rubric, a house convention — each carry their own copy, and the copies drift. There is
nowhere to keep a rule once and point several agents at it, and no way to see whether a rule
reached the model at all.

The groundwork is already in place and unused: the database carries `skills`, `skill_versions` and
`agent_skills` (with an ordering column), the shared contracts describe a skill and its type and
source, the agents module can already read and replace an agent's links, and the prompt assembler
accepts a skills slot it is never given. Nothing connects them, and no interface exists to author
a skill.

Two properties make this more than CRUD. A skill body becomes **instructions to a model**, so an
imported one is a stranger's instructions inside your reviewer. And a rule that silently fails to
reach the prompt is worse than no rule, because the reviewer looks configured and behaves as if it
were not.

## Goals

- One skill, authored once, attached to many agents, each with its own order and its own choice of
  which to use.
- The database is the source of truth at run time; nothing about a skill is read from disk.
- A reader can confirm from a completed run which skills reached the model, in what order, and what
  they cost.
- A skill can be brought in from a file without granting it any power beyond text.

## Non-goals

- Executing anything a skill or an import carries. A skill is text and only text.
- Fetching skills from a URL or a community catalogue. The shipped strings anticipate both; both
  are out of scope here, because a server-side fetch of a user-supplied address needs controls
  this feature does not have.
- Version history, usage statistics and evaluations for a skill. The `skill_versions` table exists
  and stays unused; adding it later must not require changing anything specified here.
- Changing how findings, grounding or scoring work.

## User stories

- As a reviewer author, I keep our severity rubric in one place and attach it to every agent that
  needs it, instead of pasting it into each system prompt.
- As a reviewer author, I turn a skill off for one agent without deleting it or disturbing another
  agent that still uses it.
- As a reviewer author, I decide which rule the model reads first.
- As a reviewer author, I bring in a skill someone else wrote, read it before it can affect
  anything, and enable it only once I have.
- As someone reading a completed run, I can tell which rules the reviewer was given and how much
  of the prompt they occupied.

## Acceptance criteria

### Authoring and storage

- **AC-1** — WHEN a skill is created with a name, a description, a type and a body, the system
  SHALL persist it and return it in the skills list.
  *Check:* create one through the interface, reload the page, it is listed.
- **AC-2** — The system SHALL accept exactly four types (rubric, convention, security, custom) and
  SHALL refuse any other.
  *Check:* a request carrying a fifth type is rejected and nothing is stored.
- **AC-3** — WHEN a skill is edited, the system SHALL store the new body and SHALL show the edited
  body on the next read.
  *Check:* edit, navigate away, return; the new text is there.
- **AC-4** — Every skill SHALL belong to exactly one workspace, and a read from another workspace
  SHALL behave as if the skill does not exist.
  *Check:* request a known skill id while scoped to another workspace; the answer is a not-found,
  not an empty success and not the skill.
- **AC-5** — WHERE a skill's description is shown for editing, the interface SHALL state that the
  description is the skill's interface — what it is for and when it applies — because that is what
  a future selector would read.
  *Check:* the caption is present next to the field.

### Attaching to an agent

- **AC-6** — WHEN skills are attached to an agent, the system SHALL preserve their order, and the
  same order SHALL be returned on the next read.
  *Check:* reorder, reload, the order holds.
- **AC-7** — WHEN an agent's set of attached skills is replaced, the system SHALL apply the change
  atomically; IF the replacement fails, THEN the agent SHALL keep the set it had.
  *Check:* an interrupted replacement leaves the previous set intact, never an empty one.
- **AC-8** — A skill SHALL be attachable to more than one agent at once, and detaching it from one
  agent SHALL NOT affect another.
  *Check:* attach to two agents, detach from one, the other still lists it.
- **AC-9** — Deleting a skill SHALL remove it from every agent that used it, and SHALL NOT delete
  those agents.
  *Check:* delete an attached skill; the agents survive and no longer list it.

### Reaching the model

- **AC-10** — WHEN a review runs, the system SHALL include the bodies of that agent's enabled
  attached skills, in their stored order, and SHALL exclude disabled ones.
  *Check:* the run's recorded prompt contains the enabled bodies in order and none of the disabled.
- **AC-11** — The exclusion of disabled skills SHALL happen where the skills are selected, not at
  the point of assembly, so that every consumer of that selection sees the same set.
  *Check:* a second reader of the same selection receives no disabled skill.
- **AC-12** — WHERE a skill's source is an import, the system SHALL present its body to the model
  as data inside the same delimiters used for other untrusted content; WHERE a skill was authored
  in this workspace, the system SHALL present it as instructions.
  *Check:* the recorded prompt shows an imported body delimited and a hand-written one not.
- **AC-13** — IF an imported skill body contains text that would close the delimiter, THEN the
  system SHALL neutralise it so the body cannot escape its block.
  *Check:* import a body containing a closing delimiter; the assembled prompt still has exactly one
  enclosing block.
- **AC-14** — A completed run SHALL record the skills block that was sent, and SHALL record its
  size in tokens separately from the rest of the prompt.
  *Check:* the run trace shows the block and a token figure attributable to it alone.
- **AC-15** — WHEN an agent has no enabled attached skills, the prompt SHALL contain no skills
  section at all, rather than an empty one.
  *Check:* the recorded prompt for such a run has no skills heading.

### Import

- **AC-16** — WHEN a markdown file is offered for import, the system SHALL derive a proposed skill
  from it and SHALL return that proposal without storing anything.
  *Check:* offer a file, then cancel; nothing appears in the skills list.
- **AC-17** — WHEN an archive is offered, the system SHALL take the skill body from the archive's
  skill document only, SHALL NOT read or store any other entry, and SHALL list the entries it
  ignored.
  *Check:* import an archive containing a script alongside the document; the script is named as
  ignored, nothing runs, and its content is absent from the stored body.
- **AC-18** — The system SHALL NOT write any imported file to disk and SHALL NOT execute any part
  of it.
  *Check:* no new file appears outside the database after an import.
- **AC-19** — The system SHALL refuse an import above a fixed size, measured both as delivered and
  as expanded.
  *Check:* an archive that is small compressed but very large expanded is refused rather than
  expanded.
- **AC-20** — WHEN an import is confirmed, the stored skill SHALL be disabled and SHALL be marked
  as coming from an untrusted source until a person enables it.
  *Check:* directly after import the skill is listed, visibly flagged, and absent from any run.
- **AC-21** — The system SHALL refuse a file that is neither a markdown document nor an archive.
  *Check:* offering an executable is refused with a message naming the accepted kinds.

### The reviewer this is for

- **AC-22** — A Test Quality Reviewer agent SHALL exist with attached skills, at least one of which
  arrived by import.
  *Check:* the agent lists its skills and one of them is marked as imported.
- **AC-23** — GIVEN a pull request whose test covers only the happy path, the agent WITH its skills
  SHALL report at least one finding about an uncovered branch or a boundary case that the same
  agent WITHOUT its skills does not report.
  *Check:* run both ways on the same pull request and compare the finding lists.

## Edge cases

- A skill attached to an agent is deleted while a review is running — the run completes with what
  it already assembled.
- Two skills carry the same name. Names are labels, not identifiers; nothing may depend on them
  being unique.
- An imported body is empty or whitespace only — refused at import, not stored and then skipped.
- An archive contains several markdown documents — the skill document wins; if there is none, the
  first top-level document is proposed and the rest are listed as ignored.
- An agent is attached to a skill from another workspace — impossible by AC-4; the attempt is a
  not-found.
- A skill body is large enough to crowd out the diff. The run records what it cost (AC-14) so the
  cause is visible rather than mysterious.

## Non-functional

- Listing skills and reading one must stay comfortable on a page that opens on every visit; neither
  should need more than a single round trip.
- Import is interactive: a person is waiting on the preview.
- No new runtime dependency beyond what decompressing an archive in memory requires.
- User-facing strings go through the existing translation files, which already carry this feature's
  copy; none are hard-coded.

## Cross-module interactions

- `server` owns storage and the HTTP surface, and is the only module that reads the tables.
- The agents module already owns the link between an agent and its skills; it keeps that ownership
  and gains the enabled-only selection (AC-11). The skills module never reaches into it.
- `reviewer-core` receives already-selected, already-ordered bodies plus their trust classification.
  It must not learn what a skill is, where skills are stored, or that a database exists — its
  isolation is what keeps the same engine usable from the studio and from CI.
- `client` reads and writes only through the HTTP surface.

## Contracts

- The existing skill contract and its type and source enumerations are reused unchanged.
- Whatever is added is added to both vendored copies in the same change; the two copies drifting is
  itself a defect.
- The preview returned before an import is confirmed is a contract of its own: it carries the
  proposed skill and the list of ignored entries, and it is explicitly not a stored skill.
- The run trace gains the skills block and its token count; a trace written before this feature
  existed must still load.

## Untrusted inputs

- An imported skill body is the primary one. It is authored elsewhere, it lands in the prompt, and
  it is the reason AC-12 and AC-13 exist.
- An archive is untrusted as a container as well as by content: entry names, entry count and
  expanded size are all attacker-chosen (AC-17, AC-19).
- A hand-written skill body is trusted by the same reasoning the repository already applies to an
  agent's system prompt: it is the operator instructing their own reviewer.

## Open questions

- Should a person be able to promote an imported skill to trusted after vetting it, and if so is
  that a change of source or a separate mark? Until answered, an import stays untrusted for life,
  which is the safe direction but may prove annoying.
- The mock shows a checkbox per row inside an agent and the caption "3 of 6 enabled", while the
  schema carries `enabled` on the skill itself. Read here as: the checkbox is **attachment** — six
  skills exist in the workspace, three are attached to this agent, which is why the agent's card
  reads "3 skills" — and `enabled` is a separate workspace-wide switch that keeps a skill out of
  every prompt without detaching it from anyone. Under that reading AC-8 and AC-10 stay
  consistent. If the checkbox was meant as a per-agent enable instead, the link table needs its own
  flag and AC-10 changes with it; confirm before building the agent tab.
