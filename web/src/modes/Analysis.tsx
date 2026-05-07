import { useEffect, useRef, useState } from "react";
import Board from "../components/Board";
import EngineSelect from "../components/EngineSelect";
import { EngineClient } from "../engine/api";
import type { SearchResultMsg } from "../engine/worker";

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const PRESETS: { name: string; fen: string }[] = [
  { name: "Startpos", fen: STARTPOS },
  {
    name: "Kiwipete",
    fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
  },
  {
    name: "Mate in 1 (KQ vs K)",
    fen: "7k/5K2/6Q1/8/8/8/8/8 w - - 0 1",
  },
  {
    name: "Italian Game",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
  },
  {
    name: "Endgame: K+P vs K",
    fen: "8/8/8/4k3/8/4K3/4P3/8 w - - 0 1",
  },
];

export default function Analysis() {
  const clientRef = useRef<EngineClient | null>(null);
  const [engineIds, setEngineIds] = useState<string[]>([]);
  const [engineId, setEngineId] = useState("v1_minimax");
  const [fen, setFen] = useState(STARTPOS);
  const [thinkMs, setThinkMs] = useState(1000);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SearchResultMsg | null>(null);

  useEffect(() => {
    const c = new EngineClient();
    clientRef.current = c;
    c.ready
      .then(() => c.engineIds())
      .then((ids) => {
        setEngineIds(ids);
        return c.newSession(engineId);
      })
      .catch(console.error);
    return () => c.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clientRef.current?.newSession(engineId).catch(console.error);
  }, [engineId]);

  async function analyze() {
    const c = clientRef.current;
    if (!c) return;
    setRunning(true);
    setResult(null);
    try {
      await c.setFen(fen);
      const res = await c.search({ timeMs: thinkMs });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  }

  const drawables = result?.pv?.length
    ? result.pv.slice(0, 4).map((m, i) => ({
        orig: m.slice(0, 2),
        dest: m.slice(2, 4),
        brush: i === 0 ? "green" : "blue",
      }))
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
      <div className="flex flex-col gap-4">
        <Board fen={fen} viewerColor={null} drawables={drawables} />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Position (FEN)
          </h3>
          <textarea
            rows={2}
            value={fen}
            onChange={(e) => setFen(e.target.value)}
            className="mt-2 w-full rounded-md border border-edge bg-bg-elevated px-2 py-1.5 font-mono text-xs text-ink focus:border-accent focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                className="pill hover:border-accent hover:text-accent"
                onClick={() => setFen(p.fen)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <div className="grid grid-cols-2 gap-3">
            <EngineSelect
              value={engineId}
              onChange={setEngineId}
              options={engineIds.length ? engineIds : [engineId]}
              disabled={running}
            />
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-ink-muted">
              Think time
              <select
                value={thinkMs}
                onChange={(e) => setThinkMs(Number(e.target.value))}
                disabled={running}
                className="rounded-md border border-edge bg-bg-elevated px-2 py-1.5 text-sm font-mono text-ink focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {[500, 1000, 2000, 5000].map((ms) => (
                  <option key={ms} value={ms}>
                    {ms} ms
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="btn btn-primary mt-3"
            onClick={analyze}
            disabled={running}
          >
            {running ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        <div className="panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Result
          </h3>
          {!result && (
            <p className="mt-2 text-sm text-ink-muted">
              No result yet. Pick a position and analyze.
            </p>
          )}
          {result && (
            <>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Best" value={result.bestMove ?? "—"} />
                <Stat
                  label="Eval"
                  value={
                    result.mateIn != null
                      ? `M${result.mateIn}`
                      : (result.eval / 100).toFixed(2)
                  }
                />
                <Stat label="Depth" value={result.depth} />
                <Stat label="Nodes" value={result.nodes.toLocaleString()} />
              </div>
              <div className="mt-3">
                <span className="text-xs uppercase tracking-wide text-ink-muted">
                  PV
                </span>
                <p className="mt-1 break-all font-mono text-sm">
                  {result.pv.join(" ") || "—"}
                </p>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
