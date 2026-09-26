# Conventions extractor, and the reviewer that proves skills work

Cross-package: `server`, `client`, plus the authored skills under `.claude/`.

## Problem & why

A repository teaches its rules by repetition. Every route returns the same result type, every query
goes through one module, every component is named the same way — the rule is stated hundreds of
times in code and nowhere in prose. A reviewer that has never been told the rule cannot flag a
change that breaks it, and this repository has already measured that, in an experiment its own
server-side insights record: a reviewer shown the repo's structure but none of its rules produced
three generic findings and zero project ones on a pull request that violated a house convention
outright.

The previous feature gave a rule somewhere to live. It did not help anyone notice the rule. Today
the only path from "this codebase has a convention" to "an agent enforces it" runs through a person
spotting the pattern by eye and typing it out — which is why almost nobody does it.

Two properties make this more than "ask a model for a list". A model asked to describe a codebase's
conventions will produce plausible rules whether or not they are real, and a rule nobody can check
is worse than no rule: it reads as knowledge and behaves as noise. So evidence is not something the
model asserts, it is something the system verifies. And what comes out the far end becomes
**instructions to a reviewer**, assembled by a model rather than written by the operator — which
changes who is answerable for it and when.

The second half of this spec exists because the skills mechanism is still, strictly, unproven on
one example. A second reviewer built on a different axis — API contracts — either reproduces the
result or shows the first one was luck.

## Goals

- Someone can go from "this repo has rules" to "an agent enforces them" without writing prose.
- Every candidate on screen carries evidence a reader can click through to real code, pinned to the
  commit that was scanned.
- A candidate the model invented never reaches the screen.
- A rejected candidate never reaches a generated skill.
- What is generated is an ordinary skill: everything already built for attaching, ordering,
  enabling and tracing works on it unchanged, with no special case for its origin.
- A reviewer with contract skills catches a breaking change that the same reviewer without them
  misses.

## Non-goals

- A model choosing which files to sample. Selection is code, start to finish; the model is asked
  one question, about content it was handed.
- Carrying a previous scan's accept/reject decisions into a later scan. Each scan stands alone.
- Editing a candidate's evidence. The rule is editable; the code it cites is not — evidence that a
  person can rewrite is no longer evidence.
- Attributing a particular finding to the particular skill that caught it. Runs remain attributable
  as a whole, as before.
- Importing a skill from a URL, and packaging one as a distributable plugin. Both are wanted and
  both are deliberately deferred; nothing specified here may make them harder to add.
- Executing anything from a scanned repository. Files are read and shown, never run.

## User stories

- As a reviewer author, I scan a repository I already imported and see what rules it actually
  follows, instead of guessing which ones are worth writing down.
- As a reviewer author, I can tell at a glance which proposed rules are real, because each one
  shows me the code it came from and I can open that code.
- As a reviewer author, I throw away the proposals that are wrong and keep the ones that are right,
  one at a time.
- As a reviewer author, I fix the wording of a rule that is true but badly phrased, before it ever
  reaches a prompt.
- As a reviewer author, I turn what I kept into a skill, read it in full, change it, and only then
  save it — or abandon it and leave nothing behind.
- As a reviewer author, I attach that skill to an agent the same way I attach any other.
- As someone judging whether any of this works, I can run one pull request through a reviewer twice
  — with its skills and without — and see a difference I can point at.

## Acceptance criteria

### Scanning

- **AC-1** — WHEN a scan is requested for a repository with a local working copy, the system SHALL
  choose the files to sample without calling a model, and SHALL record how many it sampled and
  which commit they were read at.
  *Check:* the scan reports a file count and a commit; scanning an unchanged working copy twice
  reports the same commit both times.
- **AC-2** — The sampled set SHALL include the repository's own configuration files where they
  exist — at least its linter, formatter and TypeScript configuration — alongside its
  highest-ranked source files, of which it SHALL take at most twelve.
  *Check:* a working copy carrying a linter config has that config named among the sampled files; a
  working copy with no configuration at all still scans; a large repository contributes twelve
  source files, not more.
- **AC-3** — The ranking of source files SHALL come from the existing index rather than being
  recomputed here, and WHEN the index has nothing for this repository the scan SHALL say so in its
  own recorded summary rather than proceeding as though it had sampled normally.
  *Check:* scan a repository that was never indexed; the recorded sample count reflects only
  configuration files, and the reason is readable afterwards without consulting a log.
- **AC-4** — IF the repository has no local working copy, THEN the system SHALL refuse the scan and
  SHALL state that as the reason, and SHALL NOT record a scan.
  *Check:* request a scan against a repository that was never cloned; the list stays empty and the
  message names the cause.
- **AC-5** — Every scan and every candidate SHALL belong to exactly one workspace and one
  repository, and SHALL be readable and changeable only through the pair it belongs to.
  *Check:* request a known scan while scoped to another workspace; the answer is a not-found. Ask
  to change a candidate through a different repository of the same workspace; that is a not-found
  too, rather than quietly succeeding.
- **AC-6** — The material sent to the model SHALL be bounded and enclosed. No single sampled file
  SHALL contribute more than four hundred lines, no scan SHALL send more than one hundred and fifty
  thousand characters in total, a file cut short SHALL say so where it was cut, and each file SHALL
  sit inside a delimiter its own contents cannot reproduce.
  *Check:* a repository whose highest-ranked file is enormous still produces a scan within those
  bounds, and the prompt shows the file marked as truncated; a file whose text contains the
  delimiter still occupies exactly one block.
- **AC-7** — WHILE a scan of a repository is running, a second scan of that repository SHALL be
  refused. The refusal SHALL rest on nothing durable: it holds only for as long as the process
  serving the first scan is alive, and a process that dies mid-scan SHALL leave nothing that has to
  be cleared before the next attempt.
  *Check:* request two scans in quick succession; one runs, the other is refused, and one scan is
  recorded. Kill the server mid-scan and scan again; it is accepted immediately.
- **AC-8** — A scan SHALL record what it cost — which provider and model answered, and the token
  and money figures where the provider reported them.
  *Check:* after a scan, those figures are readable without reconstructing them from a log.
- **AC-9** — The model this feature reaches for by default SHALL be a cheap one.
  *Check:* with no workspace override configured, a scan records a model from the same class the
  repository already uses for its other cheap background work, not its most expensive.
- **AC-10** — The feature SHALL be reachable: a navigation entry leads to a screen bound to the
  repository being worked on.
  *Check:* from a repository's pages, the entry is visible, leads to that repository's scans, and
  is highlighted while there.

### Evidence, and refusing to take the model's word

- **AC-11** — WHEN the model proposes a candidate, the system SHALL confirm the cited snippet
  against **the files it actually sampled**, and SHALL discard the candidate if the cited file was
  not among them or the snippet is not in it. A file the model names but was never shown SHALL NOT
  be opened to rescue a candidate.
  *Check:* a proposal citing a real file that was not sampled is discarded, not verified.
- **AC-12** — Matching SHALL tolerate a difference in indentation or run of spaces and nothing
  else: lines are compared with leading, trailing and repeated whitespace collapsed, and must
  otherwise be identical.
  *Check:* a snippet re-indented by the model matches; a snippet with a renamed identifier or an
  altered literal does not.
- **AC-13** — The system SHALL derive a candidate's evidence line numbers from the match it
  verified, and SHALL NOT accept line numbers proposed by the model.
  *Check:* the stored range points at where the snippet really is, including when the model stated
  a different one.
- **AC-14** — The cited path SHALL be resolved inside the scanned working copy and nowhere else.
  *Check:* a proposal whose path escapes the working copy, by traversal or by being absolute, is
  discarded rather than opened.
- **AC-15** — A quotation SHALL count as evidence only if, ignoring blank lines at its edges, it
  carries at least two non-blank lines or one line of at least twenty-four non-whitespace
  characters; and a quotation made only of punctuation and brackets SHALL never count, whatever its
  length.
  *Check:* a proposal quoting a closing brace is discarded; so is one quoting `});`; a proposal
  quoting a whole two-line statement is kept. Note this is a floor on substance, not on
  uniqueness — a substantial snippet that appears twice is still evidence.
- **AC-16** — WHERE a candidate is shown, the interface SHALL present its evidence as a file and
  line range linking to that code at the scan's commit; IF that commit is not published, THEN the
  reference SHALL still be shown as text rather than as a link that cannot resolve.
  *Check:* the link opens the cited lines and does not follow the branch; scan an unpushed commit
  and the citation is still readable, without a broken link.
- **AC-17** — A scan SHALL record how many proposals it discarded for want of evidence, and that
  number SHALL be visible on the screen that shows the scan.
  *Check:* a scan whose every proposal was discarded is distinguishable, on screen, from a scan
  that was never run.

### Deciding

- **AC-18** — Every candidate SHALL begin undecided, SHALL be settable to kept or discarded one at
  a time, SHALL be settable again to the other decision, and the decision SHALL survive a reload.
  *Check:* keep one, discard it instead, reload; it is discarded.
- **AC-19** — A candidate's rule text SHALL be editable, the edit SHALL survive a reload, and the
  edited text SHALL be what any skill built from it carries.
  *Check:* reword a rule, reload, the new wording is there; build a skill and it carries that
  wording and not the original.
- **AC-20** — Every candidate that survived verification in the latest scan SHALL be listed, and
  the interface SHALL state how many of them are currently kept.
  *Check:* the number of cards matches the scan's surviving count, and the kept count changes as
  decisions are made.
- **AC-21** — WHEN a repository is scanned again, the system SHALL warn before the earlier scan's
  candidates are replaced, SHALL then present only the new scan's candidates, and SHALL NOT carry
  the earlier decisions over.
  *Check:* keep some candidates, ask to re-scan; the warning comes first, and afterwards the new
  candidates are undecided.

### Becoming a skill

- **AC-22** — A person SHALL choose which of the kept candidates go into a given skill, rather than
  every kept candidate being taken automatically.
  *Check:* with four kept, build a skill from two of them; the other two are untouched and still
  available.
- **AC-23** — The system SHALL include only candidates in the kept state, and SHALL refuse the
  request outright if any named candidate is not kept, saying which; a candidate that does not
  exist, or belongs elsewhere, SHALL be refused as a distinct case.
  *Check:* name a discarded candidate in the request directly, bypassing the interface; then name
  an unknown one. Nothing is created either time, and the two refusals are told apart.
- **AC-24** — The system SHALL propose a name derived from the repository, and a person SHALL be
  able to read the proposed skill in full and change its name, description, type, body and whether
  it is enabled, and SHALL be able to abandon it leaving nothing stored.
  *Check:* open the proposal on a repository and the name is filled in and valid; cancel, and
  neither a skill nor anything else new exists.
- **AC-25** — What is shown as the proposed skill and what would be stored SHALL be the same text,
  produced once, on the server, and sent to the screen to be read and edited.
  *Check:* accept the proposal unedited; the stored body matches what was on screen character for
  character.
- **AC-26** — In the generated body, everything a candidate carries — its rule, edited or not, and
  its category — SHALL appear as content and SHALL NOT be able to introduce a heading, a section or
  a delimiter. WHERE this conflicts with AC-19, this criterion wins: the person's wording is
  preserved as text, not as structure.
  *Check:* reword a rule to begin with a heading marker, build the skill; the body has the same
  structure as one built from ordinary prose, and the wording is still legible inside it.
- **AC-27** — A skill built this way SHALL record which files its evidence came from, and SHALL be
  indistinguishable in use from a hand-written one — listed, attached, ordered, enabled and traced
  by the same means, with no special case for its origin.
  *Check:* read the stored skill and the evidence files are there; then attach it to an agent
  alongside a hand-written skill and reorder the two, and both behave identically.
- **AC-28** — A skill built this way SHALL be attachable to an agent from where it was created, and
  SHALL then reach that agent's prompt on the next review.
  *Check:* build one, attach it, run a review, and the completed run's record shows its body.
- **AC-29** — More than one skill SHALL be buildable from a single scan, and a candidate discarded
  at the time SHALL be absent from every one of them.
  *Check:* build two skills from one scan; no discarded rule appears in either.

### The reviewer this is for

- **AC-30** — An agent named **API Contract Reviewer** SHALL exist, and that exact name SHALL be
  the one every part of the system uses for it.
  *Check:* the agent appears under that name, and no test, seed or document refers to it by
  another.
- **AC-31** — It SHALL carry four attached skills, named for what each governs: breaking change,
  response schema, semver discipline, deprecation policy.
  *Check:* the agent lists four skills under those four names.
- **AC-32** — Each SHALL state its rule directively, SHALL show one compliant and one
  non-compliant example, and SHALL say what it must *not* flag.
  *Check:* read each; a reader can classify both a new violation and a new false alarm from the
  examples alone.
- **AC-33** — At least one of the four SHALL have arrived by import: offered as a file, previewed,
  and only then stored.
  *Check:* the stored skill's text is the file's text, and it was not present before the import —
  not merely that it is labelled as imported.
- **AC-34** — GIVEN a pull request that renames a field in a response or changes a route's
  signature, the same agent SHALL report the breaking change on every run with those four skills
  attached and enabled, and on no run with the same four detached, nothing else changed — same
  agent, same version, same pull request, same model, three runs each way. Reporting it means a
  finding whose cited file the pull request changed, whose cited lines lie inside that file's
  changed lines, and whose text names the renamed field or the altered signature.
  *Check:* run six times and compare. A split result is a real outcome and is reported as one —
  re-rolling until the numbers come out right is how this criterion becomes a lie.

## Edge cases

- The working copy has moved on since the scan. Links point at the scanned commit, so they keep
  working; the rule may nonetheless describe code that no longer exists. A scan is a statement
  about a commit, not about the branch.
- Two candidates state the same rule. Rules are text, not identifiers; nothing may depend on them
  being distinct.
- The cited snippet occurs more than once in its file. One occurrence is chosen and the recorded
  range says which; the choice must be stable across re-reads of the same file.
- The cited snippet is trivial — whitespace, a closing brace, a single common keyword. It matches
  everywhere and proves nothing, so it is not evidence; such a candidate is discarded like any other
  unevidenced one.
- Evidence lands in a file that exists in the working copy but not in the repository as published —
  generated output, an ignored file. The link would lead nowhere, which is a reason to keep such
  files out of the sample rather than to accept a dead citation.
- The model returns nothing, or everything it returned was discarded. That is a real outcome and is
  recorded as one; it must not look like a scan that never happened.
- The model returns more proposals than the system is prepared to keep. The excess is dropped, and
  the scan still succeeds — a soft limit that fails the whole scan when it is exceeded is worse
  than no limit.
- Recording the scan succeeds and recording its candidates does not. A scan that claims to have
  read fourteen files and shows nothing, forever, is the worst residue this feature can leave: the
  two are one outcome and must be recorded as one.
- A candidate is kept, a skill is built from it, and the candidate is then discarded. The skill
  already exists and is unaffected — from the moment it is stored it is an ordinary skill, and its
  origin has no further authority over it.
- The repository being scanned is this one. It is the most likely first target and the one where a
  wrong rule is most expensive, because it would then be enforced on its own future changes.
- The only repository the seed creates has never been cloned, so it cannot be scanned at all. This
  is the most likely way a first attempt fails, and it fails as a refusal about a missing working
  copy rather than as anything mentioning conventions — worth knowing before concluding the
  feature is broken.

## Non-functional

- One scan is one model call. Selecting the sample and verifying the evidence cost nothing at the
  model, and that is the point: the expensive step is the only one that can hallucinate.
- Which model runs the scan is the workspace's configured choice for this feature, not a constant.
- A person waits on a scan, so it is interactive and the interface says while it is running. The
  scan completes within the request that asked for it rather than becoming a background job — one
  model call does not earn a queue, an event contract and a second source of truth about its state.
  That choice is only safe because of AC-6: an unbounded prompt inside a request is a request that
  eventually exceeds something's patience. The model's own deadline must therefore sit below the
  request's, so exhaustion arrives as an answer saying what happened rather than as a dropped
  connection.
- Reading the latest scan and its candidates should not need more than one round trip.
- No new runtime dependency.
- User-facing strings go through the existing translation files. The copy shipped for this feature
  is not merely incomplete, it is **wrong**: alongside the missing strings for discarding, for the
  scan summary and for the whole skill proposal, it carries copy for a flow where accepting a
  candidate turns it into a skill on the spot. That is not the flow specified here, and it must be
  removed rather than left beside the new strings, because copy nobody deleted is copy someone
  will wire back up.

## Cross-module interactions

- `server` owns sampling, the model call, verification and storage, and is the only module that
  reads these tables.
- The indexer already answers "which files are most worth reading". The extractor asks it and does
  not re-derive ranking (AC-3).
- The skills module already owns what a skill is and how one is stored. The extractor creates one
  through that ownership and never writes skill storage itself; the only thing it adds to that
  module's surface is the ability to record where a skill's evidence came from.
- The agents module already owns attaching, ordering and enabling. Nothing here changes it, and
  AC-27 is the statement that nothing needed to.
- `reviewer-core` learns nothing about conventions, scans or extraction. A generated skill reaches
  it as text, exactly as a hand-written one does.
- `client` reads and writes only through the HTTP surface.

## Contracts

- The existing candidate contract is reused and extended where the behaviour above requires it: a
  three-state decision rather than a boolean, the verified line range, the category the model
  assigned, and the scan the candidate belongs to.
- The scan is a contract of its own — what was sampled, at which commit, with which model, and how
  many proposals were discarded. It is what makes AC-17 readable and AC-16 pinnable.
- A category is recorded because the model is asked for one, but nothing is specified to depend on
  it and nothing structural may be built from it (AC-26). It exists to make grouping possible
  later, not to be relied on now, and never to decide the shape of a document.
- Confidence is a fraction between zero and one, in storage and on the wire alike. Only the point
  that draws it turns it into a percentage. A number meaning a fraction in one place and a
  percentage in another is not a contract, and the interface that renders it cannot tell which it
  was handed.
- Every evidence field a stored candidate carries is required, not optional. A candidate reaches
  storage only after its file was opened and its snippet located, so "stored, but without
  evidence" is a state the extractor cannot produce; admitting it into the contract would buy
  nothing and cost an empty branch at every point that renders one.
- The proposed skill body has exactly one definition, and it lives on the server (AC-25). Two
  implementations that agree today are a defect waiting for the day one is edited, and the
  disagreement would be invisible because the screen and the store would each be showing their
  own. Putting the one definition in the shared contracts would not fix this — those are vendored
  twice by construction, so "shared" there still means two copies that can drift. The screen
  therefore asks the server what the body would be, and that costs a round trip when the proposal
  is opened, which is a price worth paying once per skill.
- Whatever changes is applied to both vendored copies in the same change; the two drifting is
  itself a defect.
- Nothing has ever been written to the candidate storage in this tree, so reshaping it carries no
  compatibility burden — a claim worth re-checking before relying on it.

## Untrusted inputs

- **The model's proposals** are the primary one. The path is used to open a file, so it must not be
  able to name a file outside what was scanned (AC-14). The snippet is matched, never executed. The
  rule text is destined for a prompt.
- **A generated skill's body** is the interesting case. The previous feature classified a
  hand-written body as trusted on the grounds that the operator was instructing their own reviewer,
  and an imported one as untrusted because a stranger wrote it. This body was written by neither: a
  model assembled it. What makes it the operator's is that AC-24 forces a person to read it and
  gives them the chance to change it before it is stored — so the approval is not a formality, it is
  the whole basis for treating the result as trusted. If that approval step is ever made optional
  or defaulted through, this classification stops holding and the body has to be delimited like an
  import.
- **The scanned repository's own contents** are read and displayed, never executed — but quoting
  them into the extraction prompt is *not* the ordinary condition a reviewer is in, and treating it
  as such is the trap here. A reviewer reads a diff and answers about it once. This reads whole
  files and its answer is kept, so a line written into a scanned file to be read as an instruction
  does not merely steer one scan: it proposes a rule, and if that rule is plausible enough to be
  kept, it is installed into every later review as something the reviewer is told. The path from
  "text in a file someone else wrote" to "standing instruction to our reviewers" is short, and the
  only narrow points on it are the enclosure of AC-6 and the human reading of AC-24. Both have to
  hold; neither is sufficient alone.

## Open questions

Three questions that were open on first writing have been settled, and are recorded here rather
than silently applied, because each was a real choice with a rejected alternative.

- **The proposed skill starts disabled.** The design the author supplied shows its enable switch
  already on; the copy shipped for that same screen says it is off so the merged body can be read
  first. The copy wins: enabling is a second, deliberate act. A screen that both asks someone to
  review a body and pre-arms it has not really asked. Worth naming plainly, because it bears on
  every appeal to the design in this document: those screens reached this work as images and are
  not in the repository, so a reader cannot check them. Where the design and something versioned
  disagree, the versioned thing wins.
- **No confidence threshold.** Everything verified is shown, strongest first. Filtering by the
  model's own confidence would be trusting the model's self-assessment to decide what a human sees,
  which is the same mistake as trusting its evidence. The reader is the filter — but if scans
  routinely return many weak proposals, that judgement should be revisited, because an extractor
  people learn to skim is an extractor people stop using.
- **The scan runs inside the request.** Stated under Non-functional with the condition that makes
  it safe.

Still open:

- Whether a re-scan should be able to remember what was decided last time. Out of scope here, and
  the reason it is called out is that the shape chosen for a scan decides whether it can be added
  later without a rewrite.
- One skill per scan, or several. The criteria allow both and the design shows one named after the
  repository. Several is permitted by AC-29, but nothing is specified about how a person would keep
  them straight afterwards, and "several skills, indistinguishable, from one scan" is a mess that
  only shows up once someone has made it.
