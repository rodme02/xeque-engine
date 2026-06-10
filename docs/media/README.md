# Hero media — pending capture

The README references a hero image at `docs/media/hero.png` (or
`hero.gif`). **It is not committed yet** — capturing it is a manual step
(a screenshot/GIF can't be generated automatically).

## What to capture

A screenshot or short GIF of the live UI showing the engine collection in
action. Good candidates:

- **Play mode** — a board mid-game against `v2_alphabeta`, with the engine
  picker visible so the three engines read clearly.
- **Arena mode** — engine-vs-engine with the Elo leaderboard, which best
  conveys "a collection of engines that compete."

## How to drop it in

1. Save the file as `docs/media/hero.png` (static) or `docs/media/hero.gif`
   (animated). Keep it reasonably sized — a few hundred KB for a PNG, a
   couple MB max for a GIF.
2. In the repo `README.md`, under the `## Demo` heading, uncomment the
   `![xeque-engine …](docs/media/hero.png)` line and remove the
   "Hero media is pending" note.
3. If you used a `.gif`, update the path in that line accordingly.

The live demo: https://rodme02.github.io/xeque-engine/
