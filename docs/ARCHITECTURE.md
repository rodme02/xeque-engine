# Architecture

xeque is **one Rust workspace** that ships **two artifacts**:

1. **`xeque-uci`** — a native binary speaking the UCI protocol. Plugs into
   Cute Chess, Arena, lichess-bot — anywhere a UCI engine fits.
2. **`xeque-wasm`** — a WebAssembly module driven by a small React UI.
   The whole site is a static deploy on GitHub Pages: visitors play the
   engines in their browser, no backend.

Both artifacts consume **the same engine code** through one trait:
[`xeque_core::Engine`](../crates/xeque-core/src/engine.rs).

```
┌──────────────────────────────────────────────────────────────┐
│  crates/xeque-core         types + Engine trait              │
│    Board (cozy-chess wrap), SearchLimits, SearchInfo, Engine │
└──────────────┬───────────────────────────────────┬───────────┘
               │                                   │
               ▼                                   ▼
┌──────────────────────────┐     ┌──────────────────────────────┐
│  crates/xeque-engines    │     │  tests/perft  (chessprog. wiki)│
│    v0_random             │     └──────────────────────────────┘
│    v1_minimax            │
│    (backlog: v2..v7)     │
└──────┬─────────────┬─────┘
       │             │
       ▼             ▼
┌─────────────┐  ┌────────────────────────────────────────────┐
│ xeque-uci   │  │ xeque-wasm  (wasm-bindgen → web/wasm/)     │
│ stdin/stdout│  │   Session: setFen, search, perft, …        │
└─────────────┘  └───────────────────┬────────────────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────────┐
                  │ web/   Vite + React + TS + Tailwind     │
                  │   Web Worker per engine instance        │
                  │   Modes: Play · Lab · Analysis · Arena  │
                  │          Perft & benchmark dashboard    │
                  └─────────────────────────────────────────┘
```

## The `Engine` trait

The whole system pivots on one tiny contract:

```rust
pub trait Engine: Send {
    fn name(&self) -> &'static str;
    fn search(
        &mut self,
        board: &Board,
        limits: SearchLimits,
        on_info: &mut dyn FnMut(&SearchInfo),
    ) -> SearchResult;
}
```

`on_info` is the streaming callback that lets the UI render live PV /
depth / NPS without polling. Engines call it whenever they have something
to report — once per iteration is the common cadence; v0_random never
calls it.

## Why one workspace, many crate boundaries?

- `xeque-core` = stable types. Compiles fast, rarely changes, no I/O.
- `xeque-engines` = pure CPU work. Each engine is its own module so the
  progression itself stays in source control as a series of files. **Old
  engines are never edited in place** — that would erase the progression.
- `xeque-uci` = thin I/O shell over the Engine trait. ~150 lines.
- `xeque-wasm` = thin wasm-bindgen shell over the Engine trait. ~200 lines.
- `xeque-bench` = criterion benchmarks, isolated so its (heavy) dev-deps
  don't leak into the main build graph.

When `xeque-engines/v2_alphabeta` lands, **none of the other crates
change** — the registry in `xeque-engines/src/lib.rs` adds one row and
the UI gets a new option in every dropdown for free.

## Frontend ↔ engine: the Web Worker contract

Each `EngineClient` (web/src/engine/api.ts) owns one `Worker`, which owns
one wasm `Session`. Arena mode spawns two clients to run two engines side
by side. The contract is request/response with one extra wrinkle: search
also streams `info` events (correlated with the request id) until it
returns the final `SearchResult`.

The frontend never re-implements chess rules in JS. Legal-move generation,
FEN parsing, move application, perft — all of it crosses the wasm boundary
to Rust. `chess.js` is used only as a quick lookup for chessground's
"legal-destination" map, never for game state.

## Build & deploy

- Local dev: `cargo build && wasm-pack build crates/xeque-wasm --target web --out-dir ../../web/wasm` then `cd web && npm run dev`.
- CI: `.github/workflows/ci.yml` — fmt, clippy `-D warnings`, tests, perft, wasm-pack, frontend typecheck + build.
- Deploy: `.github/workflows/deploy.yml` — on push to `main`, build wasm + frontend and publish `web/dist/` to GitHub Pages.
