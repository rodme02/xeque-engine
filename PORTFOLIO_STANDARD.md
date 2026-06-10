# Portfolio Standard

This file defines what "solid and finished" means for this project. Treat it as the definition of done before declaring portfolio-ready.

## README must have
- Clear one-line description above the fold
- Hero media: a screenshot, GIF, or "Try it live" link to a deployed demo
- "What it does" — concrete, no marketing fluff
- "Why it's interesting" — the technical angle that makes this not a generic project (architecture choice, performance, novel use of a tech, etc.)
- Tech stack with brief reasoning for non-obvious choices
- Quickstart: clone → install → run in fewer than 5 commands, that actually works on a fresh clone
- Usage examples or screenshots of the main flows
- Roadmap / known limitations — honest about what's incomplete

## Repo hygiene
- LICENSE file (MIT or Apache 2.0 unless there is a specific reason otherwise)
- Sensible .gitignore (no `node_modules/`, `__pycache__/`, `.DS_Store`, `.env`, build artifacts, large binaries)
- No committed credentials, API keys, or `.env` files in history
- No dead code, commented-out experiments, or orphaned TODOs/FIXMEs without context
- Real project metadata: `package.json` description + keywords, `pyproject.toml`, `Cargo.toml`, etc.
- A current `CLAUDE.md` that reflects the architecture (run `/init` if missing)

## Code quality
- Clear top-level structure — a stranger finds the entry point in under 30 seconds
- Consistent naming
- Reasonable test coverage on critical paths, or an honest "no tests yet, here's why"
- Code formatted with the language's standard tool (ruff/black, prettier, rustfmt, etc.)
- Type hints on Python public APIs; types on TypeScript public APIs
- Sensible error handling at boundaries (CLI flags, API endpoints, file I/O)

## Runnability
- End-to-end runnable on a clean clone with documented setup
- Dependencies pinned (requirements.txt with versions, package-lock.json, Cargo.lock, etc.)
- Dockerfile if it's a service or has many deps; not required for a library
- For UI/web projects: a hosted demo link or recorded GIF in the README

## Quality automation
- At least one GitHub Actions workflow: lint (and tests if any exist) on push
- Build/CI badge in the README

## Final outside-review check
Re-read the README as if you'd never seen the project, then ask honestly:
- Would I open the demo?
- Would I clone it and try to run it?
- Would I show this to a hiring manager?

If any answer is "not really," it isn't done.

---

## Project-specific checklist (xeque-engine)

A concrete, Rust + TypeScript pass for this repo. Each box must be green on
a fresh clone before tagging a release.

### Rust toolchain
- [ ] `cargo fmt --check` is clean (no diff).
- [ ] `cargo clippy --workspace --all-targets -- -D warnings` is clean —
      no `#[allow(...)]` added just to silence a lint.
- [ ] `cargo test --workspace --exclude xeque-bench` passes.
- [ ] `cargo test -p xeque-core --release --test perft` passes (movegen
      correctness is non-negotiable; CI gates on it).
- [ ] `Cargo.toml` carries real metadata (description, license, repository).
- [ ] `Cargo.lock` is committed (the workspace ships binaries).

### WASM + frontend
- [ ] `wasm-pack build crates/xeque-wasm --target web --release --out-dir
      ../../web/wasm` succeeds (generated output stays gitignored).
- [ ] `npx tsc -b` is clean. **Do not edit `tsconfig.node.json`** — its
      `composite` + `emitDeclarationOnly` config is valid; verify with
      `tsc -b` before touching it.
- [ ] `npm run build` produces a working `web/dist/`.
- [ ] TypeScript stays `strict`; the frontend never re-implements chess
      rules — all legality / movegen / perft crosses the wasm boundary to
      Rust.

### Engine progression invariants
- [ ] No shipped engine (`v0_random`, `v1_minimax`, `v2_alphabeta`) is
      edited in place — they are frozen historical artifacts.
- [ ] A new engine is one new file + one new registry row in
      `crates/xeque-engines/src/lib.rs`; no other crate changes.
- [ ] Docs agree on the shipped set (README, `docs/ENGINES.md`,
      `docs/ARCHITECTURE.md`, `CLAUDE.md`, `CHANGELOG.md`).

### Release
- [ ] `CHANGELOG.md` has an entry for the version being shipped.
- [ ] CI (`ci.yml`) and Pages deploy (`deploy.yml`) are green.
- [ ] The live demo loads and all five modes work
      (Play · Lab · Analysis · Arena · Perft).
