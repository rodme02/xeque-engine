# v0.1.0 Release Completion + Documentation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Actually ship v0.1.0 (merge + tag), then make `docs/ROADMAP.md` the single source of truth for project status and next steps, backed by a `/new-engine` project skill and a real NPS benchmark.

**Architecture:** Two git phases. Phase A finishes the release on the existing `chore/v1-release-prep` branch (CHANGELOG date fix → merge to `main` → tag `v0.1.0`; the push triggers the Pages deploy). Phase B happens on a fresh `docs/roadmap-and-cc-infra` branch off the updated `main`: delete the stale kickoff doc, replace the placeholder benchmark, add ROADMAP.md, slim ENGINES.md, repoint README/CLAUDE.md/PORTFOLIO_STANDARD at the roadmap, and add the `.claude/skills/new-engine/` skill — then merge.

**Tech Stack:** Rust (criterion 0.5 for the benchmark), Markdown, git/gh. No frontend changes, no engine changes.

**Spec:** `docs/superpowers/specs/2026-06-10-docs-overhaul-design.md`

**Deviation from spec (intentional):** The spec says fix the CHANGELOG date to `2026-05-07` (the commit date). This plan uses **`2026-06-10`** instead — Keep a Changelog dates entries by *release* date, and the release (merge → deploy → tag) happens today. If the user prefers `2026-05-07`, only Task 1 changes.

---

## Phase A — Finish the v0.1.0 release

### Task 1: Fix the CHANGELOG release date

**Files:**
- Modify: `CHANGELOG.md:8`

- [ ] **Step 1: Confirm starting state**

Run: `git status -sb && git log --oneline -2`
Expected: on branch `chore/v1-release-prep`, clean tree, top commit `71351c5 docs: spec for v0.1.0 release completion + documentation overhaul`.

- [ ] **Step 2: Apply the edit**

In `CHANGELOG.md`, change line 8:

```markdown
## [0.1.0] - 2025-05-07
```

to:

```markdown
## [0.1.0] - 2026-06-10
```

- [ ] **Step 3: Verify no other stale dates remain**

Run: `grep -rn "2025-05" CHANGELOG.md README.md docs/ CLAUDE.md PORTFOLIO_STANDARD.md`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: date v0.1.0 by its actual release date

Keep a Changelog dates entries by release date; the tag and Pages
deploy happen today, not on the prep-commit date (which also carried
a wrong year, 2025).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 2: Merge to main, tag v0.1.0, confirm deploy

**Files:** none (git/GitHub operations only)

- [ ] **Step 1: Push the branch**

Run: `git push -u origin chore/v1-release-prep`
Expected: branch pushed, no errors.

- [ ] **Step 2: Merge into main**

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff chore/v1-release-prep -m "chore: v0.1.0 release prep — docs truth pass, CHANGELOG, portfolio standard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

Expected: merge commit created and pushed. The push triggers both `ci.yml` and `deploy.yml`.

- [ ] **Step 3: Tag the release**

```bash
git tag -a v0.1.0 -m "v0.1.0 — three engines (v0_random, v1_minimax, v2_alphabeta), UCI binary, WASM module, five-mode web UI"
git push origin v0.1.0
```

Expected: tag visible at `https://github.com/rodme02/xeque-engine/releases/tag/v0.1.0` (the CHANGELOG's existing link target).

- [ ] **Step 4: Confirm CI and deploy are green**

Run: `gh run list --limit 4` (re-run until the `ci` and `deploy` runs for the merge commit show `completed success`; use `gh run watch <id>` to follow one).
Expected: both workflows green. Spot-check the live demo loads: `curl -s -o /dev/null -w "%{http_code}" https://rodme02.github.io/xeque-engine/` → `200`.

## Phase B — Cleanups, documentation system, Claude Code infra

### Task 3: Create the working branch

- [ ] **Step 1: Branch off updated main**

```bash
git checkout main
git checkout -b docs/roadmap-and-cc-infra
```

Expected: on `docs/roadmap-and-cc-infra`, clean tree.

### Task 4: Delete the stale kickoff doc

**Files:**
- Delete: `docs/V1_KICKOFF.md`

- [ ] **Step 1: Delete**

Run: `git rm docs/V1_KICKOFF.md`

- [ ] **Step 2: Verify nothing references it**

Run: `grep -rn "V1_KICKOFF" README.md CLAUDE.md PORTFOLIO_STANDARD.md CHANGELOG.md docs/ web/src/ crates/ .github/ 2>/dev/null`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: remove v1 kickoff prompt — release shipped, history preserves it

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 5: Real per-engine NPS benchmark

**Files:**
- Modify: `crates/xeque-bench/benches/nps.rs` (full replacement)

The bench iterates `xeque_engines::ENGINE_IDS` so future engines are benched automatically with zero bench-file changes. `SearchLimits::default()` (all `None`) makes each engine fall back to its default depth per the documented `SearchLimits` contract — deterministic, depth-bounded runs. `v0_random` is included for registry uniformity even though its "search" is trivial.

- [ ] **Step 1: Replace the placeholder with the real benchmark**

Full new content of `crates/xeque-bench/benches/nps.rs`:

```rust
//! Per-engine NPS benchmarks: a search from the start position at each
//! engine's default depth. Depth-bounded (not wall-clock) so runs are
//! deterministic; NPS (nodes/time) stays comparable across engines even
//! at different depths. Iterates the registry, so new engines are
//! benched automatically.

use criterion::{criterion_group, criterion_main, Criterion};
use xeque_core::{Board, SearchLimits};

fn search_startpos(c: &mut Criterion) {
    let mut group = c.benchmark_group("search_startpos_default_depth");
    group.sample_size(10);
    for &id in xeque_engines::ENGINE_IDS {
        group.bench_function(id, |b| {
            b.iter(|| {
                let mut engine = xeque_engines::build(id).expect("registered engine id");
                let board = Board::startpos();
                engine.search(&board, SearchLimits::default(), &mut |_| {})
            });
        });
    }
    group.finish();
}

criterion_group!(benches, search_startpos);
criterion_main!(benches);
```

- [ ] **Step 2: Lint it**

Run: `cargo clippy -p xeque-bench --all-targets -- -D warnings`
Expected: clean (compiles, no warnings).

- [ ] **Step 3: Smoke-run the bench in test mode**

Run: `cargo bench -p xeque-bench -- --test`
Expected: one `Testing search_startpos_default_depth/<id> ... Success` line per engine (`v0_random`, `v1_minimax`, `v2_alphabeta`), exit 0. (`-- --test` runs each bench once without statistics — fast.)

- [ ] **Step 4: Format check and commit**

```bash
cargo fmt --check
git add crates/xeque-bench/benches/nps.rs
git commit -m "feat(bench): real per-engine NPS benchmark, registry-driven

Replaces the 1+1 placeholder. Each registered engine searches startpos
at its default depth (SearchLimits::default()); new engines are picked
up automatically via ENGINE_IDS.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 6: Create `docs/ROADMAP.md`

**Files:**
- Create: `docs/ROADMAP.md`

- [ ] **Step 1: Write the file**

Full content of `docs/ROADMAP.md`:

```markdown
# Roadmap

The single source of truth for **where the project is** and **what's
next**. Update it in the same PR as the work it describes — it is part
of the "docs agree" rule in
[`PORTFOLIO_STANDARD.md`](../PORTFOLIO_STANDARD.md).

Per-version technique write-ups (shipped and backlog) live in
[`ENGINES.md`](ENGINES.md); this file tracks only status and order.

## Current status

**v0.1.0 — released 2026-06-10** ([changelog](../CHANGELOG.md) ·
[live demo](https://rodme02.github.io/xeque-engine/)).

Shipped: three engines (`v0_random`, `v1_minimax`, `v2_alphabeta`)
behind one `Engine` trait, the native UCI binary, the WASM module, the
five-mode React UI (Play · Lab · Analysis · Arena · Perft), the perft
regression suite, CI, and the GitHub Pages deploy.

## Next steps (in order)

### 1. `v3_iterative_ordering` — iterative deepening + move ordering

The next engine (technique details in
[ENGINES.md](ENGINES.md#v3_iterative_ordering)). First engine that
searches under a real time budget, so it also **restores the Think
Time control** removed from the web UI in v0.1.0 (see the v0.1.0
changelog entry).

Done when:

- [ ] One new file + one registry row; no other crate changes; frozen
      engines untouched (ship via `/new-engine`).
- [ ] ≥200 arena games vs `v2_alphabeta` at fixed time control show a
      positive Elo gain, recorded in `ENGINES.md`.
- [ ] The Think Time control is back in the web UI and functional.
- [ ] `ENGINES.md`, this file, and `CHANGELOG.md` updated; CI green.

### 2. cutechess-cli + SPRT harness

External sign-off for engine promotions: a documented, repeatable
command that runs `cutechess-cli` with an SPRT stop rule between a
candidate engine and the previous version, using the `xeque-uci`
binary.

Done when:

- [ ] A script or documented command in the repo runs the match
      end-to-end on a fresh clone.
- [ ] The `/new-engine` skill references it as the promotion gate.

### 3. Hero media in the README

A screenshot/GIF of the live UI per the spec in
[`media/README.md`](media/README.md). Manual capture — owned by the
maintainer.

Done when:

- [ ] `docs/media/hero.png` (or `.gif`) committed; README hero line
      uncommented and the "pending" note removed.

### 4–7. Engine backlog: `v4_quiescence` → `v5_tt` → `v6_tuned_eval` → `v7_nnue` / `v7_mcts`

One technique per release, each shipped via the `/new-engine` workflow
with a ≥200-game measurement vs the previous version (plus the SPRT
harness once step 2 ships). Details per version in
[ENGINES.md](ENGINES.md#backlog).

## Maintenance

- A step is done only when its "done when" boxes hold and CI is green.
- Reordering is fine — record the reason in the PR that reorders.
```

- [ ] **Step 2: Verify the anchors it links to will exist**

Task 7 gives ENGINES.md the headings `### \`v3_iterative_ordering\`` (anchor `#v3_iterative_ordering`) and `## Backlog` (anchor `#backlog`). Nothing to run yet; checked again in Task 11.

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: add ROADMAP.md — single source of truth for status + next steps

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 7: Slim `docs/ENGINES.md` to technique write-ups

**Files:**
- Modify: `docs/ENGINES.md` (full replacement — framing changes, technique content unchanged)

Changes vs current: intro points status/ordering at ROADMAP.md and names the `/new-engine` workflow; the "Shipped" status blockquote (v0.1.0 framing) is removed; `## Backlog (in order)` becomes `## Backlog` (ordering is ROADMAP's job). The nine per-engine write-ups are byte-identical to today's.

- [ ] **Step 1: Replace the file**

Full new content of `docs/ENGINES.md`:

````markdown
# Engine progression

Per-version technique write-ups for the collection — shipped and
backlog. **Status and ordering live in [`ROADMAP.md`](ROADMAP.md)**;
this file explains what each version does and why it matters.

The collection grows one technique at a time. Each version is a
separate file under `crates/xeque-engines/src/`. **Never edit an old
engine in place** — the progression itself is the portfolio. Each new
version ships via the `/new-engine` workflow
(`.claude/skills/new-engine/`) with:

- a perft test (if movegen was touched, which is never — cozy-chess does
  it for now);
- an arena-mode Elo measurement vs the previous version (≥200 games at
  fixed time control);
- a chessprogramming.org wiki link in the commit message.

## Shipped

### `v0_random`

Picks a uniformly random legal move. Baseline opponent and the smoke test
for the engine trait, wasm bridge, and UI plumbing. ~30 lines.

### `v1_minimax`

Fixed-depth negamax with **material-only** evaluation
(P=100, N=320, B=330, R=500, Q=900). No αβ, no move ordering, no
quiescence. The point is to be the *honest baseline* that v2 measurably
improves on.

- [Negamax](https://www.chessprogramming.org/Negamax)
- [Evaluation](https://www.chessprogramming.org/Evaluation)

### `v2_alphabeta`

Identical to v1 except for αβ pruning. The eval is exact (matches v1 at
the same depth — verified by a unit test); the win is purely in nodes
visited. Measured at depth 4 from the start position: v1 visits 206,603
nodes, v2 visits 2,024 — about 100× fewer. Default depth is bumped from
4 to 5 because the prune lets us afford it. In time-controlled play, the
extra ply translates directly into a large Elo jump.

- [Alpha-Beta](https://www.chessprogramming.org/Alpha-Beta)

## Backlog

### `v3_iterative_ordering`
Iterative deepening + move ordering: PV-move first, MVV-LVA for captures,
killer moves, history heuristic. Keeps responsiveness under time
controls (we can return whatever depth we finished) and dramatically
improves αβ effectiveness.
- [Iterative Deepening](https://www.chessprogramming.org/Iterative_Deepening)
- [MVV-LVA](https://www.chessprogramming.org/MVV-LVA)
- [Killer Heuristic](https://www.chessprogramming.org/Killer_Heuristic)
- [History Heuristic](https://www.chessprogramming.org/History_Heuristic)

### `v4_quiescence`
Quiescence search at the leaves to dampen the horizon effect — only
extend captures (and optionally checks). Without it, the engine
hallucinates wins from positions where its captured piece is recaptured
one ply deeper.
- [Quiescence Search](https://www.chessprogramming.org/Quiescence_Search)

### `v5_tt`
Zobrist hashing + a fixed-size transposition table with replacement
strategy (depth-preferred or aging). Big speedup; also enables PV-move
extraction.
- [Zobrist Hashing](https://www.chessprogramming.org/Zobrist_Hashing)
- [Transposition Table](https://www.chessprogramming.org/Transposition_Table)

### `v6_tuned_eval`
Replace material-only with: piece-square tables, mobility, king safety,
pawn structure (passed/isolated/doubled). Tune coefficients with
[Texel's method](https://www.chessprogramming.org/Texel%27s_Tuning_Method)
on a small labeled position dataset.

### `v7_*` (parallel directions)
- **`v7_nnue`** — NNUE-style efficiently-updateable evaluation network.
  Either train a tiny one ourselves or port an existing public network.
- **`v7_mcts`** — PUCT-style Monte Carlo Tree Search as a separate
  paradigm. Worth shipping alongside v6 as a contrast in the arena, even
  before any neural component.
````

- [ ] **Step 2: Verify the technique sections survived intact**

Run: `grep -c "chessprogramming.org" docs/ENGINES.md`
Expected: `12` (same count as before the edit).

- [ ] **Step 3: Commit**

```bash
git add docs/ENGINES.md
git commit -m "docs: slim ENGINES.md to technique write-ups; status moves to ROADMAP.md

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 8: Repoint README and PORTFOLIO_STANDARD at the roadmap

**Files:**
- Modify: `README.md:56-59` (docs pointer paragraph), `README.md:68-71` (roadmap paragraph), `README.md:126-130` (layout block)
- Modify: `PORTFOLIO_STANDARD.md:82-83` (docs-agree row)

- [ ] **Step 1: README — docs pointer paragraph**

Replace:

```markdown
See [`docs/ENGINES.md`](docs/ENGINES.md) for the backlog,
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the workspace fits
together, and [`docs/REFERENCES.md`](docs/REFERENCES.md) for the
chessprogramming.org / Rust / wasm-bindgen sources we follow.
```

with:

```markdown
See [`docs/ROADMAP.md`](docs/ROADMAP.md) for where the project is and
what's next, [`docs/ENGINES.md`](docs/ENGINES.md) for per-version
technique write-ups, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for
how the workspace fits together, and
[`docs/REFERENCES.md`](docs/REFERENCES.md) for the chessprogramming.org
/ Rust / wasm-bindgen sources we follow.
```

- [ ] **Step 2: README — roadmap paragraph in "Scope & roadmap"**

Replace:

```markdown
Future engines `v3_iterative_ordering` through `v7_nnue` / `v7_mcts` are
the backlog, tracked in [`docs/ENGINES.md`](docs/ENGINES.md). Each lands
as a new file behind the same `Engine` trait without touching the shipped
ones. See [`CHANGELOG.md`](CHANGELOG.md) for the per-release history.
```

with:

```markdown
What's next — `v3_iterative_ordering` through `v7_nnue` / `v7_mcts`,
the SPRT test harness, and more — is tracked with acceptance criteria
in [`docs/ROADMAP.md`](docs/ROADMAP.md). Each engine lands as a new
file behind the same `Engine` trait without touching the shipped ones.
See [`CHANGELOG.md`](CHANGELOG.md) for the per-release history.
```

- [ ] **Step 3: README — layout block gains ROADMAP.md**

Replace:

```
docs/
  ARCHITECTURE.md
  ENGINES.md
  REFERENCES.md
  media/                    hero screenshot/GIF (pending capture)
```

with:

```
docs/
  ROADMAP.md                where we are + next steps (source of truth)
  ARCHITECTURE.md
  ENGINES.md
  REFERENCES.md
  media/                    hero screenshot/GIF (pending capture)
```

- [ ] **Step 4: PORTFOLIO_STANDARD — docs-agree row**

Replace:

```markdown
- [ ] Docs agree on the shipped set (README, `docs/ENGINES.md`,
      `docs/ARCHITECTURE.md`, `CLAUDE.md`, `CHANGELOG.md`).
```

with:

```markdown
- [ ] Docs agree on the shipped set and the next step (README,
      `docs/ROADMAP.md`, `docs/ENGINES.md`, `docs/ARCHITECTURE.md`,
      `CLAUDE.md`, `CHANGELOG.md`).
```

- [ ] **Step 5: Verify and commit**

Run: `grep -n "ROADMAP" README.md PORTFOLIO_STANDARD.md`
Expected: three hits in README (pointer paragraph, scope paragraph, layout block), one in PORTFOLIO_STANDARD.

```bash
git add README.md PORTFOLIO_STANDARD.md
git commit -m "docs: point README and portfolio standard at ROADMAP.md

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 9: CLAUDE.md audit + roadmap repoint

**Files:**
- Modify: `CLAUDE.md` (layout block; end of "Engine progression rules"; one "Do" bullet)

- [ ] **Step 1: Run the CLAUDE.md audit skill**

Invoke `claude-md-management:claude-md-improver` (Skill tool) on this repo's `CLAUDE.md`. Apply only changes consistent with the spec (`docs/superpowers/specs/2026-06-10-docs-overhaul-design.md`): keep CLAUDE.md lean; workflows belong in the skill, not here. If the skill is unavailable in the executing context, skip this step — Steps 2–4 are the required edits either way.

- [ ] **Step 2: Layout block — add skills dir and ROADMAP.md**

Replace (inside the layout code block):

```
.github/workflows/        ci.yml, deploy.yml
docs/                     ARCHITECTURE.md, ENGINES.md, REFERENCES.md
```

with:

```
.github/workflows/        ci.yml, deploy.yml
.claude/skills/           new-engine — the ship-an-engine workflow
docs/                     ROADMAP.md, ARCHITECTURE.md, ENGINES.md, REFERENCES.md
```

- [ ] **Step 3: Engine progression rules — repoint the closing line**

Replace:

```markdown
See [`docs/ENGINES.md`](docs/ENGINES.md) for the backlog (v3 → v7).
```

with:

```markdown
See [`docs/ROADMAP.md`](docs/ROADMAP.md) for status and the ordered
next steps, and [`docs/ENGINES.md`](docs/ENGINES.md) for per-version
technique write-ups. Use the `/new-engine` skill
(`.claude/skills/new-engine/`) when shipping a new engine — it encodes
this whole workflow.
```

- [ ] **Step 4: "Do" list — widen the doc-update bullet**

Replace:

```markdown
- Update `docs/ENGINES.md` whenever a new engine ships.
```

with:

```markdown
- Update `docs/ROADMAP.md`, `docs/ENGINES.md`, and `CHANGELOG.md`
  whenever a new engine ships (the `/new-engine` skill walks this).
```

- [ ] **Step 5: Verify and commit**

Run: `grep -n "ROADMAP\|new-engine" CLAUDE.md`
Expected: hits in the layout block, the progression-rules closing line, and the Do bullet.

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md points at ROADMAP.md and the /new-engine skill

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 10: Add the `/new-engine` project skill

**Files:**
- Create: `.claude/skills/new-engine/SKILL.md`

- [ ] **Step 1: Write the skill**

Full content of `.claude/skills/new-engine/SKILL.md`:

```markdown
---
name: new-engine
description: Use when shipping a new engine version (v3, v4, …) to the xeque-engine collection — walks the full loop: one new file + one registry row, tests, an Elo measurement vs the previous version, and doc updates. Never edits shipped engines.
---

# Ship a new engine version

## Hard rules

- One new file under `crates/xeque-engines/src/vN_<name>.rs` plus one
  new row in the registry (`crates/xeque-engines/src/lib.rs`:
  `ENGINE_IDS` and `build()`). **No other crate changes.**
- **Never edit a shipped engine** — `v0_random`, `v1_minimax`,
  `v2_alphabeta`, or any vN already in the registry. They are frozen
  artifacts the arena and leaderboard compare against.
- Rust only. The frontend never re-implements chess rules.
- A new engine is promoted only on a measured Elo gain. "Looks better"
  is not enough.

## Checklist

1. **Pick the version** — the next unshipped vN in `docs/ROADMAP.md`;
   read its technique write-up in `docs/ENGINES.md` and the linked
   chessprogramming.org pages.
2. **Implement** `crates/xeque-engines/src/vN_<name>.rs` implementing
   `xeque_core::Engine`. Stream `SearchInfo` via `on_info` at iteration
   boundaries so Lab mode renders live depth / NPS / PV.
3. **Register** the id in `ENGINE_IDS` and add a `build()` arm. The UCI
   binary, web UI dropdowns, and the NPS benchmark
   (`crates/xeque-bench/benches/nps.rs`) pick it up automatically.
4. **Unit-test** inline (`#[cfg(test)]`), following the patterns in
   v1/v2 — e.g. when the change is search-only, assert the eval matches
   the previous version at equal depth. Perft only if movegen was
   touched (it shouldn't be — cozy-chess covers it).
5. **Measure**: ≥200 arena games vs the previous version at fixed time
   control (web Arena mode, or cutechess-cli). Record the result in
   `docs/ENGINES.md`. Once the SPRT harness exists (ROADMAP step 2),
   run it for external sign-off.
6. **Verify** before committing:
   `cargo fmt --check`,
   `cargo clippy --workspace --all-targets -- -D warnings`,
   `cargo test --workspace --exclude xeque-bench`,
   `cargo test -p xeque-core --release --test perft`.
7. **Docs**: move the version from Backlog to Shipped in
   `docs/ENGINES.md` (with the measured Elo), update `docs/ROADMAP.md`
   (status + next steps), add a `CHANGELOG.md` entry.
8. **Commit** with a chessprogramming.org link for the technique in the
   message. One engine per PR.
```

- [ ] **Step 2: Verify it isn't gitignored**

Run: `git check-ignore -v .claude/skills/new-engine/SKILL.md || echo "not ignored"`
Expected: `not ignored`. (If a global gitignore catches it, use `git add -f`.)

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/new-engine/SKILL.md
git commit -m "chore: add /new-engine project skill encoding the ship-an-engine loop

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

### Task 11: Full verification + cross-doc consistency pass

**Files:** none (verification only)

- [ ] **Step 1: Rust suite**

```bash
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --exclude xeque-bench
cargo test -p xeque-core --release --test perft
```

Expected: all clean / all tests pass.

- [ ] **Step 2: Bench smoke**

Run: `cargo bench -p xeque-bench -- --test`
Expected: three `Success` lines (one per engine).

- [ ] **Step 3: Cross-doc consistency greps**

```bash
grep -rn "2025-05" README.md CHANGELOG.md CLAUDE.md PORTFOLIO_STANDARD.md docs/*.md           # expect: nothing
grep -rn "V1_KICKOFF" README.md CHANGELOG.md CLAUDE.md PORTFOLIO_STANDARD.md docs/*.md        # expect: nothing
grep -rln "v2_alphabeta" README.md CLAUDE.md docs/ENGINES.md docs/ROADMAP.md docs/ARCHITECTURE.md  # expect: all five files (shipped set agrees)
grep -rn "v3_iterative_ordering" docs/ROADMAP.md                                              # expect: present (next step agrees)
```

- [ ] **Step 4: Fresh-eyes docs review**

Re-read `README.md`, `docs/ROADMAP.md`, `docs/ENGINES.md`, `docs/ARCHITECTURE.md`, `CLAUDE.md` end-to-end as a stranger: every internal link resolves (ROADMAP→ENGINES anchors `#v3_iterative_ordering` and `#backlog` exist), no doc claims a different shipped set or next step than ROADMAP.md. Fix anything found, amend the relevant commit or add a `docs: consistency fixes` commit.

### Task 12: Merge Phase B to main

- [ ] **Step 1: Push and merge**

```bash
git push -u origin docs/roadmap-and-cc-infra
git checkout main
git merge --no-ff docs/roadmap-and-cc-infra -m "docs: ROADMAP.md as source of truth, /new-engine skill, real NPS bench

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 2: Confirm CI green**

Run: `gh run list --limit 3` until the `ci` run for the merge commit is `completed success` (deploy will also re-run; both should be green).

- [ ] **Step 3: Tidy branches**

```bash
git branch -d chore/v1-release-prep docs/roadmap-and-cc-infra
git push origin --delete chore/v1-release-prep docs/roadmap-and-cc-infra
```

Expected: only `main` remains locally and on the remote.
