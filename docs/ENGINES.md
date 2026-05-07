# Engine progression

The collection grows one technique at a time. Each version is a separate
file under `crates/xeque-engines/src/`. **Never edit an old engine in
place** — the progression itself is the portfolio. Each new version ships
in its own PR with:

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

## Backlog (in order)

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
