# References

The docs to read while building this. Listed in roughly the order you'll
need them.

## Chess engine theory

- [chessprogramming.org wiki](https://www.chessprogramming.org/) — the
  canonical reference. Almost every term in the [`ENGINES.md`](./ENGINES.md)
  backlog has a page here.
- [UCI protocol spec](http://wbec-ridderkerk.nl/html/UCIProtocol.html) —
  the original spec by Stefan-Meyer Kahlen. Short and readable; this is
  what `crates/xeque-uci/src/main.rs` implements a subset of.
- [Perft results](https://www.chessprogramming.org/Perft_Results) —
  canonical movegen node counts. The `crates/xeque-core/tests/perft.rs`
  suite is a regression test against these.
- [cutechess-cli](https://github.com/cutechess/cutechess) — the standard
  tool for running engine-vs-engine matches with SPRT for Elo
  significance testing. Use this for the final ELO sign-off on each new
  engine version, in addition to the in-app arena.
- [Sebastian Lague — Coding Adventure: Chess](https://www.youtube.com/watch?v=U4ogK0MIzqk)
  — lucid intuition for the techniques on the roadmap. Watch for the
  ideas, don't copy code (different stack).

## Rust

- [The Rust Book](https://doc.rust-lang.org/book/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/) —
  enforced informally; the public API of `xeque-core` should follow it.
- [The Rust Performance Book](https://nnethercote.github.io/perf-book/) —
  before optimizing anything, read the chapter on it. Especially
  ["Type sizes"](https://nnethercote.github.io/perf-book/type-sizes.html)
  and ["Heap allocations"](https://nnethercote.github.io/perf-book/heap-allocations.html).
- [Cargo Book](https://doc.rust-lang.org/cargo/) — workspaces, profiles,
  features.
- [Clippy lints](https://rust-lang.github.io/rust-clippy/master/) — what
  CI is enforcing.

## WebAssembly

- [The wasm-bindgen Guide](https://rustwasm.github.io/docs/wasm-bindgen/)
- [wasm-pack Book](https://rustwasm.github.io/wasm-pack/)
- [Rust + WebAssembly Book](https://rustwasm.github.io/docs/book/) — the
  end-to-end walkthrough; the worker pattern in `web/src/engine/worker.ts`
  is informed by its "Without a bundler" chapter.

## Frontend

- [chessground](https://github.com/lichess-org/chessground) — the board
  component (lichess's own).
- [chess.js](https://github.com/jhlywa/chess.js) — used only for
  chessground's legal-destinations lookup; never for authoritative game
  state.
- [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/).

## Crates

| Crate                                         | Purpose                                        |
|----------------------------------------------|-----------------------------------------------|
| [`cozy-chess`](https://docs.rs/cozy-chess)   | magic-bitboard movegen                         |
| [`wasm-bindgen`](https://docs.rs/wasm-bindgen) | Rust ↔ JS interop                            |
| [`serde`](https://docs.rs/serde) + [`serde-wasm-bindgen`](https://docs.rs/serde-wasm-bindgen) | Engine ↔ UI message format |
| [`rand`](https://docs.rs/rand) (`small_rng`) | v0_random's RNG                                |
| [`thiserror`](https://docs.rs/thiserror)     | error types in `xeque-core`                    |
| [`criterion`](https://docs.rs/criterion)     | NPS / time-to-depth benchmarks                 |
| [`console_error_panic_hook`](https://docs.rs/console_error_panic_hook) | panics surface in browser devtools |
