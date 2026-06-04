# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-05-07

First public release. Ships three engines, a native UCI binary, a
WebAssembly module, and a five-mode React UI deployed to GitHub Pages.

### Added

- **Cargo workspace scaffold** — `xeque-core`, `xeque-engines`,
  `xeque-uci`, `xeque-wasm`, and `xeque-bench` crates, with a pinned
  stable toolchain and the `wasm32-unknown-unknown` target.
- **`Engine` trait** in `xeque-core` — the single contract every engine
  implements (`name` + `search` with a streaming `on_info` callback),
  consumed by the UCI binary, WASM bindings, and arena mode alike.
- **Three engines** behind the trait, each in its own file under
  `crates/xeque-engines/src/`:
  - `v0_random` — uniformly random legal move; the baseline opponent and
    plumbing smoke test.
  - `v1_minimax` — fixed-depth negamax with material-only evaluation
    (depth 4); the honest baseline.
  - `v2_alphabeta` — `v1` plus αβ pruning (depth 5); identical eval,
    ~100× fewer nodes at depth 4 from the start position.
- **UCI binary (`xeque-uci`)** speaking the UCI protocol on stdin/stdout,
  selecting an engine from the registry via `--engine <id>`. Plugs into
  Cute Chess, Arena, lichess-bot.
- **WASM `Session`** (`xeque-wasm`) — wasm-bindgen bridge hosted in a Web
  Worker so the browser UI never re-implements chess rules in JS.
- **Five-mode React UI** (Vite + TypeScript + Tailwind + chessground):
  Play, Lab (live depth / NPS / PV / eval), Analysis (paste a FEN), Arena
  (engine-vs-engine with an in-browser Elo leaderboard), and Perft
  (movegen correctness + per-engine NPS).
- **Perft regression suite** against the canonical chessprogramming.org
  positions, gated in CI.
- **CI workflow** (`.github/workflows/ci.yml`) — `cargo fmt`, `clippy -D
  warnings`, workspace tests, the perft regression, the wasm-pack build,
  and the frontend typecheck + build.
- **Deploy workflow** (`.github/workflows/deploy.yml`) — builds the WASM
  module + frontend and publishes to GitHub Pages on push to `main`.

### Removed

- **Think Time control** in the web UI — it was non-functional (the
  engines run at fixed depth, not under a time budget), so it was removed
  rather than ship a control that did nothing. It returns with
  `v3_iterative_ordering`, the first engine that searches under a real
  time budget.

[0.1.0]: https://github.com/rodme02/xeque-engine/releases/tag/v0.1.0
