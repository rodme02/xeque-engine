import { useEffect, useRef, useState } from "react";
import Board from "../components/Board";
import EngineSelect from "../components/EngineSelect";
import { EngineClient } from "../engine/api";
import type { SearchInfoMsg } from "../engine/worker";

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function Lab() {
  const clientRef = useRef<EngineClient | null>(null);
  const [engineIds, setEngineIds] = useState<string[]>([]);
  const [engineId, setEngineId] = useState("v1_minimax");
  const [fen, setFen] = useState(STARTPOS);
  const [running, setRunning] = useState(false);
  const [trace, setTrace] = useState<SearchInfoMsg[]>([]);
  const [last, setLast] = useState<SearchInfoMsg | null>(null);

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

  async function think() {
    const c = clientRef.current;
    if (!c) return;
    setRunning(true);
    setTrace([]);
    setLast(null);
    try {
      await c.setFen(fen);
      const res = await c.search({}, (info) => {
        setTrace((t) => [...t, info]);
        setLast(info);
      });
      // pin final result as last frame too
      setLast({
        depth: res.depth,
        seldepth: res.depth,
        nodes: res.nodes,
        timeMs: res.timeMs,
        eval: res.eval,
        mateIn: res.mateIn,
        pv: res.pv,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  }

  const drawables = last?.pv?.length
    ? last.pv.slice(0, 4).map((m, i) => ({
        orig: m.slice(0, 2),
        dest: m.slice(2, 4),
        brush: i === 0 ? "green" : "blue",
      }))
    : [];

  const nps = last && last.timeMs > 0 ? Math.round(last.nodes / (last.timeMs / 1000)) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
      <div className="flex flex-col gap-4">
        <Board fen={fen} viewerColor={null} drawables={drawables} />
        <div className="panel p-3 text-xs text-ink-muted">
          <span className="text-ink-dim">FEN</span>
          <input
            value={fen}
            onChange={(e) => setFen(e.target.value)}
            className="mt-1 w-full rounded-md border border-edge bg-bg-elevated px-2 py-1.5 font-mono text-xs text-ink focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="panel p-4">
          <EngineSelect
            value={engineId}
            onChange={setEngineId}
            options={engineIds.length ? engineIds : [engineId]}
            disabled={running}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="btn btn-primary"
              onClick={think}
              disabled={running}
            >
              {running ? "Thinking…" : "Think"}
            </button>
            <button
              className="btn"
              onClick={() => setFen(STARTPOS)}
              disabled={running}
            >
              Reset to startpos
            </button>
          </div>
        </div>

        <div className="panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Live stats
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Depth" value={last?.depth ?? "—"} />
            <Stat
              label="Eval"
              value={
                last
                  ? last.mateIn != null
                    ? `M${last.mateIn}`
                    : (last.eval / 100).toFixed(2)
                  : "—"
              }
            />
            <Stat label="Nodes" value={last ? last.nodes.toLocaleString() : "—"} />
            <Stat
              label="NPS"
              value={nps ? nps.toLocaleString() : "—"}
            />
          </div>
          <div className="mt-3">
            <span className="text-xs uppercase tracking-wide text-ink-muted">
              PV
            </span>
            <p className="mt-1 break-all font-mono text-sm">
              {last?.pv?.join(" ") || "—"}
            </p>
          </div>
        </div>

        <div className="panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Iteration trace
          </h3>
          <table className="mt-2 w-full text-left font-mono text-xs">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-1 text-right pr-3">d</th>
                <th className="py-1 text-right pr-3">eval</th>
                <th className="py-1 text-right pr-3">nodes</th>
                <th className="py-1 text-right pr-3">ms</th>
                <th className="py-1">pv</th>
              </tr>
            </thead>
            <tbody>
              {trace.map((info, i) => (
                <tr key={i} className="border-t border-edge">
                  <td className="py-1 text-right pr-3">{info.depth}</td>
                  <td className="py-1 text-right pr-3">
                    {info.mateIn != null
                      ? `M${info.mateIn}`
                      : (info.eval / 100).toFixed(2)}
                  </td>
                  <td className="py-1 text-right pr-3">
                    {info.nodes.toLocaleString()}
                  </td>
                  <td className="py-1 text-right pr-3">{info.timeMs}</td>
                  <td className="py-1 truncate">{info.pv.join(" ")}</td>
                </tr>
              ))}
              {trace.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-ink-muted">
                    Press “Think” to stream search progress.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
