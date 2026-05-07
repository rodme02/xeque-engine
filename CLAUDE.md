# CLAUDE.md

Guidance for Claude / AI assistants working in this repository.

## Project: xeque-engine

A long-haul chess engine in **Rust**, speaking **UCI**, tested via
**perft** for movegen correctness and **`cutechess-cli` + SPRT** for
ELO impact on every change. Single-language, single-purpose.

The author also maintains [`pygame-chess-minimax`][pygame] — a
feature-complete Pygame + naive minimax prototype. **That repo is
frozen.** Don't propose Pygame, Python, multi-language, or
educational rewrites here — this repo's scope is "serious Rust
engine, measured by ELO."

[pygame]: https://github.com/rodme02/pygame-chess-minimax

## Current state (as of 2026-05-07)

- The repo holds `LICENSE`, `README.md`, and this file. No Rust code
  yet; `rustup` is not yet installed on the author's machine.
- Next step on the roadmap: scaffold (`cargo init` + add
  `cozy-chess`), then perft tests + GitHub Actions.

When the scaffold lands, update this file's "Repo layout" section
below.

## Conventions

- **Language**: Rust only. No FFI to other languages, no Python
  scripts in the build path.
- **Layout**: Rust at repo root. No `engine/` or `src/` wrapper
  subdirectory — `Cargo.toml`, `src/`, `tests/` live directly at the
  repo root.
- **Naming**: idiomatic Rust — `snake_case` functions and modules,
  `CamelCase` types, `SCREAMING_SNAKE` consts.
- **Style**: enforced by `cargo fmt`. CI fails on `cargo fmt --check`.
- **Lints**: enforced by `cargo clippy -- -D warnings`. Don't
  `#[allow(...)]` lints to silence them — fix the underlying issue.
- **Dependencies**: prefer well-tested crates over hand-rolling when
  they shorten the path. `cozy-chess` for movegen is decided. Keep
  the dependency tree small; chess engines benefit from a tight
  build footprint.

## Testing philosophy

- **Movegen correctness** is non-negotiable. Every supported feature
  has a perft test against a known FEN/depth/node-count from
  chessprogramming.org. No exceptions.
- **Search/eval changes** must show statistically significant ELO
  improvement via `cutechess-cli` + SPRT before merging. "Looks
  better" is not enough — measure or skip.
- **Unit tests** for any non-trivial pure function (eval terms,
  hashing, time-management math). Property tests where appropriate
  (e.g., `move == undo(do(move)) → identity`).

## What to do — and not do

**Do:**
- Frame every search/eval change in terms of expected ELO impact.
- Add or extend perft tests when changing movegen.
- Keep diffs small and on-topic; one feature per PR.
- Run `cargo fmt && cargo clippy && cargo test` before commits.
- Reference the relevant chessprogramming.org page in commit messages
  when implementing a known technique.

**Don't:**
- Don't propose Python, Pygame, JavaScript, or any non-Rust component.
  The Pygame prototype lives in a different repo and is frozen.
- Don't add eval terms or search heuristics without a measurement
  plan. Untuned heuristics are net-negative more often than they help.
- Don't optimize prematurely. Profile first; the literature has the
  right priorities (movegen → search depth → eval → tuning).
- Don't `unsafe` unless it's the only way and the invariant is
  documented in a comment.
- Don't touch `git config` (system policy). Don't `--no-verify` past
  pre-commit hooks.

## Repo layout

To be filled in when the cargo scaffold lands. Expected:

```
Cargo.toml      Manifest. Pinned cozy-chess.
src/
  main.rs       UCI loop (binary entry).
  lib.rs        Library root re-exporting the search/eval/board API.
  board.rs      Position type wrapping cozy-chess.
  search.rs     Negamax + αβ + (later) iterative deepening.
  eval.rs       Material → tuned eval.
  uci.rs        UCI protocol parsing/responding.
tests/
  perft.rs      Perft tests against known FENs.
.github/
  workflows/
    ci.yml      fmt + clippy + test.
```

Adjust as the project evolves; keep this file in sync.
