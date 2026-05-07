import { useEffect, useMemo, useRef, useState } from "react";
import Board from "../components/Board";
import EngineSelect from "../components/EngineSelect";
import { EngineClient } from "../engine/api";
import {
  loadRatings,
  saveRatings,
  ratingOf,
  recordGame,
  clearRatings,
  type Outcome as EloOutcome,
  type RatingTable,
} from "../engine/elo";

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const MAX_PLIES = 200;

type GameSummary = {
  white: string;
  black: string;
  result: "1-0" | "0-1" | "1/2-1/2";
  plies: number;
};

export default function Arena() {
  const whiteRef = useRef<EngineClient | null>(null);
  const blackRef = useRef<EngineClient | null>(null);
  const stopRef = useRef(false);

  const [engineIds, setEngineIds] = useState<string[]>([]);
  const [whiteId, setWhiteId] = useState("v1_minimax");
  const [blackId, setBlackId] = useState("v0_random");
  const [games, setGames] = useState(10);
  const [running, setRunning] = useState(false);

  const [fen, setFen] = useState(STARTPOS);
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [history, setHistory] = useState<GameSummary[]>([]);
  const [ratings, setRatings] = useState<RatingTable>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    const w = new EngineClient();
    const b = new EngineClient();
    whiteRef.current = w;
    blackRef.current = b;
    Promise.all([w.ready, b.ready])
      .then(() => w.engineIds())
      .then((ids) => {
        setEngineIds(ids);
      })
      .catch(console.error);
    setRatings(loadRatings());
    return () => {
      w.terminate();
      b.terminate();
    };
  }, []);

  async function runMatch() {
    const w = whiteRef.current;
    const b = blackRef.current;
    if (!w || !b) return;
    stopRef.current = false;
    setRunning(true);
    setHistory([]);
    setProgress({ done: 0, total: games });

    let table = { ...ratings };
    for (let i = 0; i < games && !stopRef.current; i++) {
      const swap = i % 2 === 1;
      const wId = swap ? blackId : whiteId;
      const bId = swap ? whiteId : blackId;
      const summary = await playOne(w, b, wId, bId);

      const outcomeForWhite: EloOutcome =
        summary.result === "1-0"
          ? "win"
          : summary.result === "0-1"
            ? "loss"
            : "draw";
      // Map result back to original whiteId/blackId perspectives.
      const outcomeForA: EloOutcome =
        whiteId === wId
          ? outcomeForWhite
          : outcomeForWhite === "win"
            ? "loss"
            : outcomeForWhite === "loss"
              ? "win"
              : "draw";

      if (whiteId !== blackId) {
        table = recordGame(table, whiteId, blackId, outcomeForA);
        setRatings(table);
        saveRatings(table);
      }

      setHistory((h) => [...h, summary]);
      setProgress({ done: i + 1, total: games });
    }
    setRunning(false);
  }

  async function playOne(
    w: EngineClient,
    b: EngineClient,
    wId: string,
    bId: string,
  ): Promise<GameSummary> {
    await w.newSession(wId);
    await b.newSession(bId);
    await w.setStartpos();
    await b.setStartpos();

    let plies = 0;
    let curFen = STARTPOS;
    setFen(curFen);
    setLastMove(null);

    while (plies < MAX_PLIES && !stopRef.current) {
      const stm = curFen.split(" ")[1] === "b" ? "black" : "white";
      const mover = stm === "white" ? w : b;
      const other = stm === "white" ? b : w;

      const res = await mover.search({});
      if (!res.bestMove) break;

      await mover.makeMove(res.bestMove);
      await other.makeMove(res.bestMove);
      curFen = await mover.fen();
      setFen(curFen);
      setLastMove([res.bestMove.slice(0, 2), res.bestMove.slice(2, 4)]);
      plies++;

      if (await mover.isCheckmate()) {
        // The side-to-move (the one who would move next) was just mated.
        return {
          white: wId,
          black: bId,
          result: stm === "white" ? "1-0" : "0-1",
          plies,
        };
      }
      if (await mover.isStalemate()) {
        return { white: wId, black: bId, result: "1/2-1/2", plies };
      }
    }
    return { white: wId, black: bId, result: "1/2-1/2", plies };
  }

  function stop() {
    stopRef.current = true;
  }

  function resetRatings() {
    clearRatings();
    setRatings({});
  }

  const leaderboard = useMemo(() => {
    return engineIds
      .map((id) => ({ id, rating: ratingOf(ratings, id) }))
      .sort((a, b) => b.rating - a.rating);
  }, [engineIds, ratings]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
      <div className="flex flex-col gap-4">
        <Board fen={fen} viewerColor={null} lastMove={lastMove} />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="panel p-4">
          <div className="grid grid-cols-2 gap-3">
            <EngineSelect
              label="White"
              value={whiteId}
              onChange={setWhiteId}
              options={engineIds.length ? engineIds : [whiteId]}
              disabled={running}
            />
            <EngineSelect
              label="Black"
              value={blackId}
              onChange={setBlackId}
              options={engineIds.length ? engineIds : [blackId]}
              disabled={running}
            />
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-ink-muted">
              Games
              <select
                value={games}
                onChange={(e) => setGames(Number(e.target.value))}
                disabled={running}
                className="rounded-md border border-edge bg-bg-elevated px-2 py-1.5 text-sm font-mono text-ink focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {[2, 4, 10, 20, 50].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="btn btn-primary"
              onClick={runMatch}
              disabled={running}
            >
              {running ? "Running…" : "Run match"}
            </button>
            <button className="btn" onClick={stop} disabled={!running}>
              Stop
            </button>
            <button className="btn" onClick={resetRatings} disabled={running}>
              Reset Elo
            </button>
          </div>
          {progress.total > 0 && (
            <p className="mt-3 text-xs text-ink-muted">
              Game {progress.done} / {progress.total} · colors swap each game
            </p>
          )}
        </div>

        <div className="panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Leaderboard
          </h3>
          <table className="mt-2 w-full font-mono text-sm">
            <tbody>
              {leaderboard.map((row, i) => (
                <tr key={row.id} className="border-t border-edge first:border-0">
                  <td className="py-1 text-ink-muted">#{i + 1}</td>
                  <td className="py-1 pl-2">{row.id}</td>
                  <td className="py-1 text-right">{Math.round(row.rating)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Match log
          </h3>
          <table className="mt-2 w-full font-mono text-sm">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-1 text-left">white</th>
                <th className="py-1 text-left">black</th>
                <th className="py-1 text-right">result</th>
                <th className="py-1 text-right">plies</th>
              </tr>
            </thead>
            <tbody>
              {history.map((g, i) => (
                <tr key={i} className="border-t border-edge">
                  <td className="py-1">{g.white}</td>
                  <td className="py-1">{g.black}</td>
                  <td
                    className={
                      "py-1 text-right " +
                      (g.result === "1-0"
                        ? "text-win"
                        : g.result === "0-1"
                          ? "text-loss"
                          : "text-draw")
                    }
                  >
                    {g.result}
                  </td>
                  <td className="py-1 text-right">{g.plies}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-ink-muted">
                    No games yet.
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
