import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "../components/Board";
import EngineSelect from "../components/EngineSelect";
import { EngineClient } from "../engine/api";

const STARTPOS = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type Played = { uci: string; san: string };

function uciToSan(fenBefore: string, uci: string): string {
  try {
    const c = new Chess(fenBefore);
    const m = c.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    });
    return m?.san ?? uci;
  } catch {
    return uci;
  }
}

type Outcome =
  | { kind: "ongoing" }
  | { kind: "checkmate"; winner: "white" | "black" }
  | { kind: "stalemate" }
  | { kind: "resigned"; winner: "white" | "black" };

export default function Play() {
  const clientRef = useRef<EngineClient | null>(null);
  const [engineIds, setEngineIds] = useState<string[]>([]);
  const [engineId, setEngineId] = useState("v1_minimax");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [fen, setFen] = useState(STARTPOS);
  const [history, setHistory] = useState<Played[]>([]);
  const [thinking, setThinking] = useState(false);
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "ongoing" });

  useEffect(() => {
    const c = new EngineClient();
    clientRef.current = c;
    c.ready
      .then(() => c.engineIds())
      .then((ids) => setEngineIds(ids))
      .then(() => c.newSession(engineId))
      .catch((e) => console.error("engine boot failed", e));
    return () => c.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!clientRef.current || engineIds.length === 0) return;
    void (async () => {
      await clientRef.current!.newSession(engineId);
      await clientRef.current!.setFen(fen);
      // If it's the engine's turn, kick off thinking.
      maybeEngineMove();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineId]);

  const turnColor = useMemo<"white" | "black">(
    () => (fen.split(" ")[1] === "b" ? "black" : "white"),
    [fen],
  );

  const pairs = useMemo(() => {
    const out: { num: number; white?: string; black?: string }[] = [];
    for (let i = 0; i < history.length; i += 2) {
      out.push({
        num: i / 2 + 1,
        white: history[i]?.san,
        black: history[i + 1]?.san,
      });
    }
    return out;
  }, [history]);

  async function newGame() {
    const c = clientRef.current;
    if (!c) return;
    await c.setStartpos();
    setFen(STARTPOS);
    setHistory([]);
    setLastMove(null);
    setOutcome({ kind: "ongoing" });
    if (playerColor === "black") {
      await maybeEngineMove(STARTPOS);
    }
  }

  async function flipColor() {
    const next = playerColor === "white" ? "black" : "white";
    setPlayerColor(next);
    if (turnColor !== next && outcome.kind === "ongoing") {
      await maybeEngineMove();
    }
  }

  async function onUserMove(uci: string) {
    const c = clientRef.current;
    // Don't gate on `thinking` — there's a window between the engine
    // committing its move (setFen → board interactive again) and
    // setThinking(false) where a click would be silently dropped. Whose
    // turn it is comes from the FEN; that's the only authority that
    // matters.
    if (!c || outcome.kind !== "ongoing") return;
    if (turnColor !== playerColor) return;
    const fenBefore = fen;
    try {
      await c.makeMove(uci);
    } catch (e) {
      console.warn("rejected move", uci, e);
      return;
    }
    const newFen = await c.fen();
    setFen(newFen);
    setHistory((h) => [...h, { uci, san: uciToSan(fenBefore, uci) }]);
    setLastMove([uci.slice(0, 2), uci.slice(2, 4)]);
    if (await checkAndSetOutcome(c)) return;
    await maybeEngineMove(newFen);
  }

  async function maybeEngineMove(fenOverride?: string) {
    const c = clientRef.current;
    if (!c) return;
    const fenBefore = fenOverride ?? fen;
    const stm = fenBefore.split(" ")[1] === "b" ? "black" : "white";
    if (stm === playerColor) return;
    if (await c.isGameOver()) return;
    setThinking(true);
    try {
      const result = await c.search({});
      if (result.bestMove) {
        const uci = result.bestMove;
        await c.makeMove(uci);
        const after = await c.fen();
        setFen(after);
        setHistory((h) => [...h, { uci, san: uciToSan(fenBefore, uci) }]);
        setLastMove([uci.slice(0, 2), uci.slice(2, 4)]);
        // Flip the spinner off as soon as the move lands so the status
        // label and the input-gate match. The outcome check below is
        // independent.
        setThinking(false);
        await checkAndSetOutcome(c);
      } else {
        setThinking(false);
      }
    } catch (e) {
      console.error("engine move failed", e);
      setThinking(false);
    }
  }

  async function checkAndSetOutcome(c: EngineClient): Promise<boolean> {
    const cm = await c.isCheckmate();
    if (cm) {
      const stm = await c.sideToMove();
      setOutcome({
        kind: "checkmate",
        winner: stm === "white" ? "black" : "white",
      });
      return true;
    }
    const sm = await c.isStalemate();
    if (sm) {
      setOutcome({ kind: "stalemate" });
      return true;
    }
    return false;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
      <div>
        <Board
          fen={fen}
          orientation={playerColor}
          viewerColor={
            outcome.kind === "ongoing" && turnColor === playerColor
              ? playerColor
              : null
          }
          lastMove={lastMove}
          onUserMove={onUserMove}
        />
      </div>
      <aside className="flex flex-col gap-4">
        <div className="panel p-4">
          <EngineSelect
            label="Opponent"
            value={engineId}
            onChange={setEngineId}
            options={engineIds.length ? engineIds : [engineId]}
            disabled={thinking}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={newGame}>
              New game
            </button>
            <button className="btn" onClick={flipColor} disabled={thinking}>
              Play as {playerColor === "white" ? "black" : "white"}
            </button>
          </div>
        </div>

        <div className="panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Status
          </h3>
          <p className="mt-1 font-mono text-sm">
            {outcome.kind === "ongoing"
              ? thinking
                ? `${engineId} is thinking…`
                : `${turnColor} to move`
              : outcome.kind === "checkmate"
                ? `Checkmate — ${outcome.winner} wins`
                : outcome.kind === "stalemate"
                  ? "Stalemate"
                  : `Resigned — ${outcome.winner} wins`}
          </p>
        </div>

        <div className="panel p-4">
          <h3 className="text-xs uppercase tracking-wide text-ink-muted">
            Moves
          </h3>
          {history.length === 0 ? (
            <p className="mt-1 text-sm text-ink-muted">No moves yet.</p>
          ) : (
            <div className="mt-1 grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5 font-mono text-sm">
              {pairs.map((p) => (
                <Fragment key={p.num}>
                  <span className="text-right text-ink-muted">{p.num}.</span>
                  <span>{p.white ?? ""}</span>
                  <span className="text-ink-dim">{p.black ?? ""}</span>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
