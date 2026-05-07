# CLAUDE.md

Guidance for Claude / AI assistants working in this repository.

## Project: xeque-engine

A growing **collection of chess engines** in Rust, packaged as:

1. A native **UCI binary** (`xeque-uci`) that plugs into Cute Chess /
   Arena / lichess-bot.
2. A **WebAssembly** build driven by a React UI in `web/`. The whole
   site is a static deploy on GitHub Pages — visitors play in their
   browser, no backend.

The progression of engines IS the portfolio: each new technique
(αβ → iterative deepening → TT → tuned eval → NNUE) lands as a
**separate engine version** behind the same `Engine` trait. Old engines
are never edited in place.

The author also maintains [`pygame-chess-minimax`][pygame] — a Pygame
prototype with a naive minimax. **That repo is frozen.** Don't propose
Python, multi-language, or educational rewrites here.

[pygame]: https://github.com/rodme02/pygame-chess-minimax

## Layout

```
Cargo.toml                workspace
crates/
  xeque-core              Board (cozy-chess wrap), Engine trait, types
  xeque-engines           v0_random, v1_minimax, registry, future engines
  xeque-uci               UCI binary
  xeque-wasm              wasm-bindgen Session
  xeque-bench             criterion benchmarks
  xeque-core/tests/perft  canonical perft regression
web/                      Vite + React + TS + Tailwind + chessground
  src/engine/             worker.ts, api.ts, elo.ts
  src/components/         Board, EngineSelect
  src/modes/              Play, Lab, Analysis, Arena, Perft
.github/workflows/        ci.yml, deploy.yml
docs/                     ARCHITECTURE.md, ENGINES.md, REFERENCES.md
```

## Conventions

- **Rust only** for engine code. WASM is a target, not a separate
  language. The frontend is TypeScript and stays UI-only — never
  re-implements chess rules. All legality / movegen / perft crosses the
  wasm boundary to Rust.
- **Layout**: workspace at repo root with `crates/<name>/` for each
  member. The root has no top-level `src/`.
- **Naming**: idiomatic Rust — `snake_case` fns/modules, `CamelCase`
  types, `SCREAMING_SNAKE` consts. TypeScript uses `camelCase` and
  `PascalCase` per JS conventions; wasm-bindgen renames Rust
  `snake_case` to JS `camelCase` via `js_name`.
- **Style**: enforced by `cargo fmt`, `prettier` is not used (small
  surface — the React files are tidy by hand).
- **Lints**: `cargo clippy --workspace --all-targets -- -D warnings`.
  Don't `#[allow(...)]` to silence — fix the issue. TypeScript runs in
  `strict` mode.
- **Dependencies**: prefer well-tested crates over hand-rolling.
  `cozy-chess` for movegen is decided. Keep the dep tree small.

## Engine progression rules

- One new engine = one new file under `crates/xeque-engines/src/`. The
  registry in `lib.rs` gets one new row. Other crates do not change.
- **Never edit `v0_random` or `v1_minimax` in place** to "improve" them.
  They are historical artifacts that the arena / leaderboard compares
  against.
- Each new engine ships with:
  - A perft test if movegen was touched (rare — cozy-chess covers it).
  - An arena-mode Elo measurement vs the previous version (≥200 games at
    fixed time control). For external sign-off, run `cutechess-cli` +
    SPRT against a reference build.
  - A `chessprogramming.org` link in the commit message for any known
    technique.

See [`docs/ENGINES.md`](docs/ENGINES.md) for the backlog (v2 → v7).

## Testing philosophy

- **Movegen correctness** is non-negotiable. The perft suite at
  `crates/xeque-core/tests/perft.rs` runs canonical positions; CI gates
  on it.
- **Search/eval changes** must show ELO improvement before they're
  promoted. "Looks better" is not enough.
- **Unit tests** for non-trivial pure functions (eval terms, hashing,
  time-management math). Property tests where they fit
  (`do(undo(m)) == identity`, etc.).
- Frontend changes are verified in the browser end-to-end: Vite dev
  server + Chrome / Firefox. Type checks and unit tests verify *code*
  correctness, not feature correctness.

## What to do — and not do

**Do:**
- Frame search/eval changes in terms of expected ELO impact.
- Add or extend perft when changing movegen.
- Keep PRs small and on-topic; one feature per PR.
- Run `cargo fmt && cargo clippy && cargo test` before commits.
- Reference chessprogramming.org pages in commit messages for known
  techniques.
- Update `docs/ENGINES.md` whenever a new engine ships.

**Don't:**
- Don't propose Python, Pygame, or non-Rust engine components. The
  Pygame prototype is frozen elsewhere.
- Don't re-implement chess rules in TypeScript. All legality crosses
  the wasm boundary to Rust.
- Don't add eval terms or search heuristics without a measurement plan.
- Don't optimize prematurely. Profile first.
- Don't `unsafe` unless it's the only way and the invariant is
  documented.
- Don't touch `git config` (system policy). Don't `--no-verify` past
  pre-commit hooks.

## Commands

```bash
# Native build / test
cargo build --workspace
cargo test --workspace --exclude xeque-bench
cargo test -p xeque-core --release --test perft
cargo test -p xeque-core --release --test perft -- --ignored   # deep perft
cargo bench -p xeque-bench

# UCI binary
cargo run --release -p xeque-uci -- --engine v1_minimax

# WASM build (output goes to web/wasm/)
wasm-pack build crates/xeque-wasm --target web --release --out-dir ../../web/wasm

# Frontend
cd web && npm install && npm run dev      # dev server
cd web && npm run build                   # production bundle (web/dist/)
```
