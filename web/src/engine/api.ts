/// Shared client for the engine Web Worker. Spawning two `EngineClient`s
/// gives us two independent sessions (one per engine) — that's what arena
/// mode uses for engine-vs-engine matches.

import type {
  WorkerRequest,
  SearchInfoMsg,
  SearchResultMsg,
} from "./worker";

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  onInfo?: (info: SearchInfoMsg) => void;
};

// Distributive Omit: applies Omit to each variant of a union individually.
type DistOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
type RequestSansId = DistOmit<WorkerRequest, "id">;

export class EngineClient {
  private worker: Worker;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  public readonly ready: Promise<void>;

  constructor() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (e: MessageEvent) => this.onMessage(e);
    this.ready = this.send({ type: "ready" }).then(() => {});
  }

  terminate() {
    this.worker.terminate();
  }

  private onMessage(e: MessageEvent) {
    const data = e.data as
      | { id: number; type: "info"; info: SearchInfoMsg }
      | { id: number; ok: true; result: unknown }
      | { id: number; ok: false; error: string };
    const p = this.pending.get(data.id);
    if (!p) return;
    if ("type" in data && data.type === "info") {
      p.onInfo?.(data.info);
      return;
    }
    this.pending.delete(data.id);
    if ("ok" in data) {
      if (data.ok) p.resolve(data.result);
      else p.reject(new Error(data.error));
    }
  }

  private send<T>(
    req: RequestSansId,
    onInfo?: (info: SearchInfoMsg) => void,
  ): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        onInfo,
      });
      this.worker.postMessage({ ...(req as object), id } as WorkerRequest);
    });
  }

  engineIds = () => this.send<string[]>({ type: "engineIds" });
  newSession = (engineId: string) =>
    this.send<string>({ type: "newSession", engineId });
  setStartpos = () => this.send<null>({ type: "setStartpos" });
  setFen = (fen: string) => this.send<null>({ type: "setFen", fen });
  fen = () => this.send<string>({ type: "fen" });
  legalMoves = () => this.send<string[]>({ type: "legalMoves" });
  makeMove = (uci: string) => this.send<null>({ type: "makeMove", uci });
  sideToMove = () => this.send<"white" | "black">({ type: "sideToMove" });
  isGameOver = () => this.send<boolean>({ type: "isGameOver" });
  isCheckmate = () => this.send<boolean>({ type: "isCheckmate" });
  isStalemate = () => this.send<boolean>({ type: "isStalemate" });
  search = (
    opts: { depth?: number; timeMs?: number },
    onInfo?: (info: SearchInfoMsg) => void,
  ) =>
    this.send<SearchResultMsg>(
      { type: "search", depth: opts.depth, timeMs: opts.timeMs },
      onInfo,
    );
  perft = (depth: number) => this.send<number>({ type: "perft", depth });
}
