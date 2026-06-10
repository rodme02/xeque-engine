# Design: v0.1.0 release completion + documentation overhaul

**Date:** 2026-06-10
**Status:** Approved
**Goal:** Make the repo's documentation the single source of truth for
"where we are and what's next", optimized for Claude Code-driven
development — and make the docs' central claim ("v0.1.0 shipped") true
by actually finishing the release.

## Context

A repo-health survey (2026-06-10) found the codebase clean: no dead
code, no TODO/FIXME leftovers, complete .gitignore, solid CI/deploy
workflows, tests appropriate for scope. The findings that motivated
this design:

1. **Release-state discrepancy.** All docs say v0.1.0 shipped, but no
   `v0.1.0` git tag exists, the `CHANGELOG.md` entry is dated
   `2025-05-07` (the commit date is 2026-05-07 — wrong year), and the
   release work sits on the unmerged `chore/v1-release-prep` branch.
   The Pages deploy only runs on push to `main`.
2. **No single "where we are / next steps" doc.** Status is smeared
   across README, `docs/ENGINES.md`, `CHANGELOG.md`, and
   `PORTFOLIO_STANDARD.md` — exactly the drift hazard
   PORTFOLIO_STANDARD's "docs agree" rule warns about.
3. **Minor cruft.** `crates/xeque-bench/benches/nps.rs` is a `1 + 1`
   placeholder; `docs/V1_KICKOFF.md` is a one-shot planning prompt for
   a release that is now done; README hero media is still pending
   capture.

## Decisions (user-approved)

- **Finish the release** rather than document it as pending.
- **Scope:** docs + Claude Code infra (not docs-only, not minimal).
- **Roadmap home:** new `docs/ROADMAP.md` as the single source of
  truth; `docs/ENGINES.md` slims to technique deep-dives.
- **Claude Code infra:** one project skill (`new-engine`) only.
  Releases stay a manual checklist in `PORTFOLIO_STANDARD.md`.
- **Cleanups:** delete `docs/V1_KICKOFF.md` (git history preserves
  it); replace the placeholder benchmark with a real one; hero media
  stays a roadmap item for the user to capture.

## Phase 0 — Finish the v0.1.0 release

1. Fix the `CHANGELOG.md` date: `2025-05-07` → `2026-05-07`.
2. Commit on `chore/v1-release-prep`, merge into `main`, push.
   The push triggers the Pages deploy (`deploy.yml`).
3. Tag `v0.1.0` on the merge result and push the tag. The CHANGELOG's
   existing release-tag link then resolves.

## Phase 1 — Easy cleanups

1. **Delete `docs/V1_KICKOFF.md`.**
2. **Real NPS benchmark** in `crates/xeque-bench/benches/nps.rs`:
   for each registered engine, a search from the start position at
   that engine's default depth (criterion). Depth-bounded — not
   wall-clock — so runs are deterministic; NPS (nodes/time) stays
   comparable across engines even at different depths. `v0_random`
   is included for registry uniformity even though its "search" is
   trivial. Smoke-run via `cargo bench -p xeque-bench`.
3. **Hero media is NOT in scope** — listed in ROADMAP.md as a next
   step owned by the user (capture from the live demo).

## Phase 2 — Documentation system

### New `docs/ROADMAP.md` (single source of truth for project state)

Sections:
- **Current status** — v0.1.0 shipped (3 engines, UCI binary, WASM
  module, five-mode UI, perft regression, CI + Pages deploy), with the
  date and a CHANGELOG link.
- **Next steps, in order** — each with acceptance criteria:
  1. `v3_iterative_ordering` — iterative deepening + move ordering;
     also restores the Think Time control removed in v0.1.0 (first
     engine that searches under a real time budget). Acceptance:
     ≥200-game arena Elo measurement vs `v2_alphabeta` showing a
     positive result; UI control functional.
  2. **cutechess-cli + SPRT harness** — external sign-off tooling for
     engine promotions. Acceptance: documented, repeatable command
     that gates a vN promotion.
  3. **Hero media** — screenshot/GIF per `docs/media/README.md` spec,
     README line uncommented.
  4. `v4_quiescence` → `v5_tt` → `v6_tuned_eval` → `v7_nnue`/`v7_mcts`
     — each: new file + registry row + measurement vs previous.
- **How this doc is maintained** — updated in the same PR as the work
  it describes; ROADMAP.md is included in PORTFOLIO_STANDARD's
  "docs agree" rule.

### Slim `docs/ENGINES.md`

Keeps: the per-engine technique write-ups (shipped v0–v2, backlog
v3–v7) with chessprogramming.org links and the shipping rules (one
file per engine, never edit frozen engines, measurement requirement).
Loses: release/status framing and ordering claims — those move to
ROADMAP.md, with a cross-link each way.

### CLAUDE.md audit

Run the `claude-md-management:claude-md-improver` skill during
implementation. Required outcomes regardless of audit details:
- Points to `docs/ROADMAP.md` as the source of truth for status and
  next steps (replacing the current pointer to ENGINES.md "for the
  backlog").
- Mentions the `/new-engine` skill as the way to ship a new engine.
- Stays lean — workflows live in the skill, not CLAUDE.md.

### README + PORTFOLIO_STANDARD.md

- README "Scope & roadmap" section shrinks to a short paragraph +
  pointer to `docs/ROADMAP.md` (smaller drift surface). Project-layout
  block gains `docs/ROADMAP.md` and loses `V1_KICKOFF.md` if listed.
- PORTFOLIO_STANDARD.md "docs agree on the shipped set" checklist row
  adds `docs/ROADMAP.md`.

## Phase 3 — Claude Code infra

`.claude/skills/new-engine/SKILL.md` — a project skill (invocable as
`/new-engine`) encoding the ship-an-engine loop:

1. One new file under `crates/xeque-engines/src/vN_<name>.rs`; one new
   registry row in `lib.rs`. No other crate changes.
2. Never edit frozen engines (v0–v2 and any shipped vN).
3. Unit tests for the new engine; perft only if movegen was touched
   (it isn't — cozy-chess covers it).
4. Elo measurement: ≥200 arena games vs the previous version at fixed
   time control; cutechess-cli + SPRT for external sign-off once the
   harness exists.
5. Commit message carries a chessprogramming.org link for the
   technique.
6. Update `docs/ENGINES.md` (move technique from backlog to shipped),
   `docs/ROADMAP.md` (status + next steps), `CHANGELOG.md`.
7. Run the full verification suite before commit (fmt, clippy, tests,
   release perft).

## Out of scope

- Implementing any engine (v3+) or the SPRT harness itself.
- Capturing hero media.
- A `release` skill — PORTFOLIO_STANDARD.md remains the manual
  release checklist.
- Any edit to frozen engines or to chess logic.

## Verification

- Before each commit: `cargo fmt --check`,
  `cargo clippy --workspace --all-targets -- -D warnings`,
  `cargo test --workspace --exclude xeque-bench`,
  `cargo test -p xeque-core --release --test perft`.
- Benchmark change: `cargo bench -p xeque-bench` completes.
- Docs: final cross-consistency pass — README, ROADMAP.md, ENGINES.md,
  ARCHITECTURE.md, CLAUDE.md, CHANGELOG.md, PORTFOLIO_STANDARD.md all
  agree on the shipped set and the next step.
- Release: CI green on `main`; `v0.1.0` tag exists; live demo loads.
