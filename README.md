# xeque-engine

A chess engine in Rust, speaking UCI.

> *Xeque* is Portuguese for *check*.

> **Status:** scaffolding. Code lands incrementally; this README will keep
> pace with what actually compiles. As of today the repo holds the LICENSE
> and the project's intent — nothing more.

## Goals

- **Strong**, on a long-haul timeline. Targeting a working tower of
  techniques: negamax → α-β → iterative deepening → move ordering →
  quiescence → transposition tables → tuned eval → selectivity →
  opening books / endgame tablebases → NNUE or self-play RL.
- **Correct.** Movegen is verified by [perft][perft] against known
  node counts; every change in search/eval is measured for ELO impact
  via [`cutechess-cli`][cutechess] + SPRT.
- **Idiomatic Rust.** Performance from day one — no Python, no
  premature abstractions. `cozy-chess` for movegen.
- **Plays anywhere a UCI engine plugs in:** Cute Chess, Arena,
  ChessBase, Lichess bot, etc.

## Roadmap

1. **Scaffold** — Cargo + `cozy-chess`, GitHub Actions (`fmt --check`,
   `clippy -D warnings`, `test`), perft test rig.
2. **MVP engine** — fixed-depth negamax + α-β + material-only eval +
   minimal UCI loop. First milestone: beat Stockfish at depth 1 in
   Cute Chess.
3. **Real search** — iterative deepening with time management, move
   ordering (MVV-LVA, killers), quiescence search to dampen the
   horizon effect.
4. **Transposition table.** Zobrist hashing, replacement strategy.
5. **Tuned evaluation.** Mobility, king safety, pawn structure,
   piece-square tables — tuned via Texel or similar.
6. **Selectivity.** Late move reductions, null move pruning, futility
   pruning.
7. **Opening books / endgame tablebases.** Polyglot books, Syzygy
   probing.
8. **NNUE** or self-play reinforcement learning.

Each step is gated on an SPRT-verified ELO improvement against the
previous version. No change ships if it can't show statistical
significance.

## Build

Once the scaffold lands:

```bash
cargo build --release
./target/release/xeque-engine        # speaks UCI on stdin/stdout
cargo test                           # runs perft + unit tests
```

Until then, you can clone and watch.

## Sister project

[`pygame-chess-minimax`][pygame-repo] — a complete Pygame chess game
with a naive depth-3 minimax engine. Same author, same chess
obsession, different stack. That codebase is feature-complete and
frozen; this one is where the long-haul work lives.

## License

MIT.

[perft]: https://www.chessprogramming.org/Perft
[cutechess]: https://github.com/cutechess/cutechess
[pygame-repo]: https://github.com/rodme02/pygame-chess-minimax
