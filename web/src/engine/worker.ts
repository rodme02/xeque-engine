/// <reference lib="webworker" />
import init, { Session, engineIds } from "../../wasm/xeque_wasm.js";

export type WorkerRequest =
  | { id: number; type: "ready" }
  | { id: number; type: "engineIds" }
  | { id: number; type: "newSession"; engineId: string }
  | { id: number; type: "setStartpos" }
  | { id: number; type: "setFen"; fen: string }
  | { id: number; type: "fen" }
  | { id: number; type: "legalMoves" }
  | { id: number; type: "makeMove"; uci: string }
  | { id: number; type: "isGameOver" }
  | { id: number; type: "isCheckmate" }
  | { id: number; type: "isStalemate" }
  | { id: number; type: "sideToMove" }
  | {
      id: number;
      type: "search";
      depth?: number;
      timeMs?: number;
    }
  | { id: number; type: "perft"; depth: number };

export type SearchInfoMsg = {
  depth: number;
  seldepth: number;
  nodes: number;
  timeMs: number;
  eval: number;
  mateIn: number | null;
  pv: string[];
};

export type SearchResultMsg = {
  bestMove: string | null;
  depth: number;
  nodes: number;
  timeMs: number;
  eval: number;
  mateIn: number | null;
  pv: string[];
};

type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string }
  | { id: number; type: "info"; info: SearchInfoMsg };

let session: Session | null = null;
const initialized: Promise<unknown> = init();

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  await initialized;
  const req = e.data;
  try {
    const result = handle(req);
    (self as unknown as Worker).postMessage({
      id: req.id,
      ok: true,
      result,
    } satisfies WorkerResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse);
  }
};

function handle(req: WorkerRequest): unknown {
  switch (req.type) {
    case "ready":
      return true;
    case "engineIds":
      return engineIds();
    case "newSession":
      session = new Session(req.engineId);
      return session.engineName();
    case "setStartpos":
      ensure().setStartpos();
      return null;
    case "setFen":
      ensure().setFen(req.fen);
      return null;
    case "fen":
      return ensure().fen();
    case "legalMoves":
      return ensure().legalMoves();
    case "makeMove":
      ensure().makeMove(req.uci);
      return null;
    case "isGameOver":
      return ensure().isGameOver();
    case "isCheckmate":
      return ensure().isCheckmate();
    case "isStalemate":
      return ensure().isStalemate();
    case "sideToMove":
      return ensure().sideToMove();
    case "search": {
      const onInfo = (info: SearchInfoMsg) => {
        (self as unknown as Worker).postMessage({
          id: req.id,
          type: "info",
          info,
        } satisfies WorkerResponse);
      };
      return ensure().search(req.depth, req.timeMs, onInfo) as SearchResultMsg;
    }
    case "perft":
      return Number(ensure().perft(req.depth));
  }
}

function ensure(): Session {
  if (!session) throw new Error("session not initialized");
  return session;
}
