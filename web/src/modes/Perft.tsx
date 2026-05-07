import { useEffect, useRef, useState } from "react";
import EngineSelect from "../components/EngineSelect";
import { EngineClient } from "../engine/api";

type PerftCase = {
  name: string;
  fen: string;
  /// (depth, expected) rows
  rows: [number, number][];
};

const PERFT_CASES: PerftCase[] = [
  {
    name: "Startpos",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    rows: [
      [1, 20],
      [2, 400],
      [3, 8902],
      [4, 197281],
    ],
  },
  {
    name: "Kiwipete",
    fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    rows: [
      [1, 48],
      [2, 2039],
      [3, 97862],
    ],
  },
  {
    name: "Position 3",
    fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
    rows: [
      [1, 14],
      [2, 191],
      [3, 2812],
      [4, 43238],
    ],
  },
  {
    name: "Position 5",
    fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8",
    rows: [
      [1, 44],
      [2, 1486],
      [3, 62379],
    ],
  },
  {
    name: "Position 6",
    fen: "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10",
    rows: [
      [1, 46],
      [2, 2079],
      [3, 89890],
    ],
  },
];

const BENCH_FENS = [
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
  "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
];

type Cell =
  | { state: "idle" }
  | { state: "running" }
  | { state: "ok"; got: number; ms: number }
  | { state: "fail"; got: number; expected: number; ms: number };

type BenchRow = { engineId: string; nps: number; nodes: number; timeMs: number };

export default function Perft() {
  const clientRef = useRef<EngineClient | null>(null);
  const [engineIds, setEngineIds] = useState<string[]>([]);
  const [cells, setCells] = useState<Cell[][]>(() =>
    PERFT_CASES.map((c) => c.rows.map(() => ({ state: "idle" }) as Cell)),
  );
  const [running, setRunning] = useState(false);

  const [benchEngine, setBenchEngine] = useState("v1_minimax");
  const [benchDepth, setBenchDepth] = useState(4);
  const [benching, setBenching] = useState(false);
  const [benchRows, setBenchRows] = useState<BenchRow[]>([]);

  useEffect(() => {
    const c = new EngineClient();
    clientRef.current = c;
    c.ready
      .then(() => c.engineIds())
      .then((ids) => setEngineIds(ids))
      .then(() => c.newSession("v0_random"))
      .catch(console.error);
    return () => c.terminate();
  }, []);

  async function runPerft() {
    const c = clientRef.current;
    if (!c) return;
    setRunning(true);
    const next: Cell[][] = PERFT_CASES.map((cs) =>
      cs.rows.map(() => ({ state: "running" }) as Cell),
    );
    setCells(next);

    for (let i = 0; i < PERFT_CASES.length; i++) {
      const cs = PERFT_CASES[i];
      await c.setFen(cs.fen);
      for (let j = 0; j < cs.rows.length; j++) {
        const [depth, expected] = cs.rows[j];
        const t0 = performance.now();
        const got = await c.perft(depth);
        const ms = performance.now() - t0;
        next[i] = [...next[i]];
        next[i][j] =
          got === expected
            ? { state: "ok", got, ms }
            : { state: "fail", got, expected, ms };
        setCells([...next]);
      }
    }
    setRunning(false);
  }

  async function runBench() {
    const c = clientRef.current;
    if (!c) return;
    setBenching(true);
    setBenchRows([]);
    try {
      await c.newSession(benchEngine);
      let totalNodes = 0;
      let totalMs = 0;
      for (const fen of BENCH_FENS) {
        await c.setFen(fen);
        const r = await c.search({ depth: benchDepth });
        totalNodes += r.nodes;
        totalMs += r.timeMs || 1;
      }
      const nps = Math.round(totalNodes / (totalMs / 1000));
      setBenchRows((rows) => [
        ...rows,
        { engineId: benchEngine, nps, nodes: totalNodes, timeMs: totalMs },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setBenching(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="panel p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-ink-muted">
              Perft regression
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Validates movegen against canonical chessprogramming.org node
              counts. All cells should turn green.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={runPerft}
            disabled={running}
          >
            {running ? "Running…" : "Run perft"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PERFT_CASES.map((cs, i) => (
            <div key={cs.name} className="rounded-md border border-edge p-3">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{cs.name}</span>
              </div>
              <div className="mt-1 truncate font-mono text-[10px] text-ink-muted">
                {cs.fen}
              </div>
              <table className="mt-2 w-full font-mono text-xs">
                <thead className="text-ink-muted">
                  <tr>
                    <th className="py-1 text-left">d</th>
                    <th className="py-1 text-right">expected</th>
                    <th className="py-1 text-right">got</th>
                    <th className="py-1 text-right">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {cs.rows.map(([d, exp], j) => {
                    const cell = cells[i][j];
                    const text =
                      cell.state === "running"
                        ? "…"
                        : cell.state === "idle"
                          ? "—"
                          : cell.got.toLocaleString();
                    const cls =
                      cell.state === "ok"
                        ? "text-win"
                        : cell.state === "fail"
                          ? "text-loss"
                          : "text-ink-dim";
                    return (
                      <tr key={d} className="border-t border-edge">
                        <td className="py-1">{d}</td>
                        <td className="py-1 text-right">
                          {exp.toLocaleString()}
                        </td>
                        <td className={"py-1 text-right " + cls}>{text}</td>
                        <td className="py-1 text-right text-ink-muted">
                          {cell.state === "ok" || cell.state === "fail"
                            ? cell.ms.toFixed(1)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-ink-muted">
              Engine benchmark
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Runs the engine on a fixed set of positions at fixed depth and
              reports nodes / second.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <EngineSelect
              value={benchEngine}
              onChange={setBenchEngine}
              options={engineIds.length ? engineIds : [benchEngine]}
              disabled={benching}
            />
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-ink-muted">
              Depth
              <select
                value={benchDepth}
                onChange={(e) => setBenchDepth(Number(e.target.value))}
                disabled={benching}
                className="rounded-md border border-edge bg-bg-elevated px-2 py-1.5 text-sm font-mono text-ink focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {[2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn btn-primary"
              onClick={runBench}
              disabled={benching}
            >
              {benching ? "Benching…" : "Run benchmark"}
            </button>
          </div>
        </div>
        <table className="mt-3 w-full font-mono text-sm">
          <thead className="text-ink-muted">
            <tr>
              <th className="py-1 text-left">engine</th>
              <th className="py-1 text-right">total nodes</th>
              <th className="py-1 text-right">time (ms)</th>
              <th className="py-1 text-right">NPS</th>
            </tr>
          </thead>
          <tbody>
            {benchRows.map((r, i) => (
              <tr key={i} className="border-t border-edge">
                <td className="py-1">{r.engineId}</td>
                <td className="py-1 text-right">{r.nodes.toLocaleString()}</td>
                <td className="py-1 text-right">{r.timeMs}</td>
                <td className="py-1 text-right">{r.nps.toLocaleString()}</td>
              </tr>
            ))}
            {benchRows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-center text-ink-muted">
                  No benchmarks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
