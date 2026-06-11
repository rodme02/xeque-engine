---
name: new-engine
description: Use when shipping a new engine version (v3, v4, …) to the xeque-engine collection — walks the full loop: one new file + one registry row, tests, an Elo measurement vs the previous version, and doc updates. Never edits shipped engines.
---

# Ship a new engine version

## Hard rules

- One new file under `crates/xeque-engines/src/vN_<name>.rs` plus one
  new row in the registry (`crates/xeque-engines/src/lib.rs`:
  `ENGINE_IDS` and `build()`). **No other crate changes.**
- **Never edit a shipped engine** — `v0_random`, `v1_minimax`,
  `v2_alphabeta`, or any vN already in the registry. They are frozen
  artifacts the arena and leaderboard compare against.
- Rust only. The frontend never re-implements chess rules.
- A new engine is promoted only on a measured Elo gain. "Looks better"
  is not enough.

## Checklist

1. **Pick the version** — the next unshipped vN in `docs/ROADMAP.md`;
   read its technique write-up in `docs/ENGINES.md` and the linked
   chessprogramming.org pages.
2. **Implement** `crates/xeque-engines/src/vN_<name>.rs` implementing
   `xeque_core::Engine`. Stream `SearchInfo` via `on_info` at iteration
   boundaries so Lab mode renders live depth / NPS / PV.
3. **Register** the id in `ENGINE_IDS` and add a `build()` arm. The UCI
   binary, web UI dropdowns, and the NPS benchmark
   (`crates/xeque-bench/benches/nps.rs`) pick it up automatically.
4. **Unit-test** inline (`#[cfg(test)]`), following the patterns in
   v1/v2 — e.g. when the change is search-only, assert the eval matches
   the previous version at equal depth. Perft only if movegen was
   touched (it shouldn't be — cozy-chess covers it).
5. **Measure**: ≥200 arena games vs the previous version at a fixed
   per-move limit (web Arena mode, or cutechess-cli). Record the result
   on the engine's **Measured:** line in `docs/ENGINES.md`. Once the
   SPRT harness exists (ROADMAP step 2), run it for external sign-off.
6. **Verify** before committing:
   `cargo fmt --check`,
   `cargo clippy --workspace --all-targets -- -D warnings`,
   `cargo test --workspace --exclude xeque-bench`,
   `cargo test -p xeque-core --release --test perft`.
7. **Docs**: move the version from Backlog to Shipped in
   `docs/ENGINES.md` (with its **Measured:** line), update
   `docs/ROADMAP.md` (status + next steps), add a `CHANGELOG.md` entry.
8. **Commit** with a chessprogramming.org link for the technique in the
   message. One engine per PR.
