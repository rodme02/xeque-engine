# xeque-engine

A growing collection of chess engines, written in **Rust**, playable in
the browser via **WebAssembly** and via the **UCI** protocol from any
chess GUI.

> [**Live demo →**](https://rodme02.github.io/xeque-engine/)

[![ci](https://github.com/rodme02/xeque-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/rodme02/xeque-engine/actions/workflows/ci.yml)
[![deploy](https://github.com/rodme02/xeque-engine/actions/workflows/deploy.yml/badge.svg)](https://github.com/rodme02/xeque-engine/actions/workflows/deploy.yml)
[![rust](https://img.shields.io/badge/rust-stable-orange)](rust-toolchain.toml)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> *Xeque* is Portuguese for *check*.

## Demo

[![Live demo](https://img.shields.io/badge/play-live%20demo-2ea44f)](https://rodme02.github.io/xeque-engine/)

<!--
  Hero media pending capture. Drop a screenshot or GIF of Play or Arena mode
  at docs/media/hero.png (or hero.gif) and uncomment the line below. See
  docs/media/README.md for the spec.
-->
<!-- ![xeque-engine — Play / Arena mode](docs/media/hero.png) -->

> **Hero media is pending** — see [`docs/media/`](docs/media/). Until a
> screenshot/GIF is dropped in, the [live demo](https://rodme02.github.io/xeque-engine/)
> above is the best way to see the UI in action.

## What's here

- A Cargo workspace with **three engines** — `v0_random`,
  `v1_minimax` (material eval, depth 4), and `v2_alphabeta`
  (αβ pruning, depth 5) — all implementing one
  [`Engine`](crates/xeque-core/src/engine.rs) trait.
- A native **UCI** binary (`xeque-uci`) that plugs into Cute Chess, Arena,
  lichess-bot, etc.
- A **WASM** build of the engines that runs in a Web Worker.
- A polished **React** UI with five modes:
  - **Play** — challenge any engine in the collection.
  - **Lab** — watch the search think in real time (depth, NPS, PV, eval).
  - **Analysis** — paste a FEN, get the engine's best move and PV.
  - **Arena** — engine-vs-engine with an Elo leaderboard.
  - **Perft** — movegen correctness + per-engine NPS benchmarks.
- A **perft regression suite** against the canonical chessprogramming.org
  positions.

The progression of engines is the portfolio: each shipped version
(`v0_random`, `v1_minimax`, `v2_alphabeta`) and every roadmap version
(`v3_iterative_ordering`, `v4_quiescence`, `v5_tt`, `v6_tuned_eval`,
`v7_nnue` / `v7_mcts`) lands as its own file behind the same `Engine`
trait. Old engines are never edited — visitors can pick any version and
feel the technique that was added.

See [`docs/ENGINES.md`](docs/ENGINES.md) for the backlog,
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the workspace fits
together, and [`docs/REFERENCES.md`](docs/REFERENCES.md) for the
chessprogramming.org / Rust / wasm-bindgen sources we follow.

## Scope & roadmap

**v0.1.0 ships exactly what's above** — three engines (`v0_random`,
`v1_minimax`, `v2_alphabeta`), the native UCI binary, the WASM module,
the five-mode React UI, the perft regression suite, and CI + GitHub Pages
deploy. Nothing here is a stub: every mode and every engine works today.

Future engines `v3_iterative_ordering` through `v7_nnue` / `v7_mcts` are
the backlog, tracked in [`docs/ENGINES.md`](docs/ENGINES.md). Each lands
as a new file behind the same `Engine` trait without touching the shipped
ones. See [`CHANGELOG.md`](CHANGELOG.md) for the per-release history.

## Quick start

### Native (UCI binary)

```bash
cargo build --release -p xeque-uci
./target/release/xeque-uci --engine v1_minimax
# then type `uci`, `isready`, `position startpos`, `go depth 5`, …
```

### Web (browser UI)

```bash
# 1. build the wasm module
wasm-pack build crates/xeque-wasm --target web --release --out-dir ../../web/wasm

# 2. run the dev server
cd web
npm install
npm run dev
```

### Tests

```bash
cargo test --workspace --exclude xeque-bench
cargo test -p xeque-core --release --test perft               # fast
cargo test -p xeque-core --release --test perft -- --ignored  # deeper
```

## Project layout

```
Cargo.toml                  workspace
rust-toolchain.toml         pinned stable + wasm32 target
crates/
  xeque-core/               Board, Engine trait, SearchLimits/Info/Result
  xeque-engines/            v0_random, v1_minimax, v2_alphabeta, registry
  xeque-uci/                UCI binary (--engine selects from registry)
  xeque-wasm/               wasm-bindgen Session
  xeque-bench/              criterion benchmarks
  xeque-core/tests/perft.rs canonical perft regression
web/                        Vite + React + TS + Tailwind + chessground
  src/engine/worker.ts      Web Worker hosting the wasm Session
  src/engine/api.ts         RPC client for the worker
  src/engine/elo.ts         in-browser Elo (K=32) for the leaderboard
  src/components/Board.tsx  chessground wrapper
  src/components/EngineSelect.tsx  engine picker (reads the registry)
  src/modes/{Play,Lab,Analysis,Arena,Perft}.tsx
.github/workflows/
  ci.yml                    fmt + clippy + test + perft + wasm + frontend
  deploy.yml                wasm + frontend → GitHub Pages
CHANGELOG.md                per-release history (Keep a Changelog)
docs/
  ARCHITECTURE.md
  ENGINES.md
  REFERENCES.md
  media/                    hero screenshot/GIF (pending capture)
```

## License

MIT.
