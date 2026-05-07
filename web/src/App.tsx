import { useState } from "react";
import Play from "./modes/Play";
import Lab from "./modes/Lab";
import Analysis from "./modes/Analysis";
import Arena from "./modes/Arena";
import Perft from "./modes/Perft";

type Mode = "play" | "lab" | "analysis" | "arena" | "perft";

const MODES: { id: Mode; label: string; tagline: string }[] = [
  { id: "play", label: "Play", tagline: "challenge any engine in the collection" },
  { id: "lab", label: "Lab", tagline: "watch the search think in real time" },
  { id: "analysis", label: "Analysis", tagline: "probe a position from FEN" },
  { id: "arena", label: "Arena", tagline: "engine vs engine + Elo leaderboard" },
  { id: "perft", label: "Perft", tagline: "movegen + benchmark dashboard" },
];

export default function App() {
  const [mode, setMode] = useState<Mode>("play");
  const active = MODES.find((m) => m.id === mode)!;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-edge">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xl font-semibold tracking-tight">
              xeque
            </span>
            <span className="text-xs text-ink-muted">
              a growing collection of chess engines · written in rust · running
              in your browser
            </span>
          </div>
          <nav className="flex gap-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                  (m.id === mode
                    ? "bg-accent text-white"
                    : "text-ink-dim hover:text-ink")
                }
              >
                {m.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              {active.label}
            </h1>
            <p className="text-sm text-ink-muted">{active.tagline}</p>
          </div>
          {mode === "play" && <Play />}
          {mode === "lab" && <Lab />}
          {mode === "analysis" && <Analysis />}
          {mode === "arena" && <Arena />}
          {mode === "perft" && <Perft />}
        </div>
      </main>

      <footer className="border-t border-edge py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 text-xs text-ink-muted">
          <span>
            built with rust · cozy-chess · wasm-bindgen · react · chessground
          </span>
          <a
            className="hover:text-ink"
            href="https://github.com/rodme02/xeque-engine"
            target="_blank"
            rel="noreferrer"
          >
            github
          </a>
        </div>
      </footer>
    </div>
  );
}
