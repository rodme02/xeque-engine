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
- [ ] ≥200 arena games vs `v2_alphabeta` at a fixed per-move limit
      (v2 at its default depth — record the exact settings) show a
      positive Elo gain, recorded on a **Measured:** line in
      `ENGINES.md`.
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
- [ ] The `/new-engine` skill references it as the external
      sign-off gate.

### 3. Hero media in the README

A screenshot/GIF of the live UI per the spec in
[`media/README.md`](media/README.md). Manual capture — owned by the
maintainer.

Done when:

- [ ] `docs/media/hero.png` (or `.gif`) committed; README hero line
      uncommented and the "pending" note removed.

### Then: engine backlog — `v4_quiescence` → `v5_tt` → `v6_tuned_eval` → `v7_nnue` / `v7_mcts`

One technique per release, each shipped via the `/new-engine` workflow
with a ≥200-game measurement vs the previous version (plus the SPRT
harness once step 2 ships). Details per version in
[ENGINES.md](ENGINES.md#backlog). Each is promoted to a numbered step
with its own "Done when" list when it reaches the front of the queue.

## Maintenance

- A step is done only when its "done when" boxes hold and CI is green.
- Reordering is fine — record the reason in the PR that reorders.
