import { useEffect, useRef } from "react";
import { Chessground as makeChessground } from "chessground";
import type { Api } from "chessground/api";
import type { Config } from "chessground/config";
import type { Color, Key } from "chessground/types";
import { Chess, SQUARES } from "chess.js";

export type BoardProps = {
  fen: string;
  /// Color the user controls. `null` for spectate-only.
  orientation?: "white" | "black";
  viewerColor?: "white" | "black" | null;
  lastMove?: [string, string] | null;
  /// Arrows / highlights drawn from the engine's PV, etc.
  drawables?: { orig: string; dest: string; brush?: string }[];
  /// Called when the user makes a legal move (UCI string, e.g. "e2e4").
  onUserMove?: (uci: string) => void;
};

export default function Board({
  fen,
  orientation = "white",
  viewerColor = "white",
  lastMove,
  drawables = [],
  onUserMove,
}: BoardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<Api | null>(null);

  // Keep the latest onUserMove in a ref so chessground's `events.after`
  // (configured once at init) always calls the current handler without
  // forcing the chessground instance to be torn down on every render.
  const onUserMoveRef = useRef(onUserMove);
  useEffect(() => {
    onUserMoveRef.current = onUserMove;
  }, [onUserMove]);

  useEffect(() => {
    if (!ref.current) return;
    const config: Config = {
      fen,
      orientation,
      turnColor: turnFromFen(fen),
      movable: {
        free: false,
        // Always an object so chessground.set never replaces state.movable
        // with undefined (which crashes its destroy path).
        color: viewerColor ?? undefined,
        dests: viewerColor ? legalDests(fen) : new Map(),
        showDests: true,
        events: {
          after: (orig, dest) => {
            const promo = needsPromotion(fen, orig, dest) ? "q" : "";
            onUserMoveRef.current?.(`${orig}${dest}${promo}`);
          },
        },
      },
      premovable: { enabled: false },
      drawable: { enabled: true, autoShapes: drawables.map(toShape) },
      lastMove: toLastMove(lastMove),
      animation: { enabled: true, duration: 180 },
    };
    apiRef.current = makeChessground(ref.current, config);
    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // Re-create only when the orientation flips. fen / lastMove / drawables
    // / viewerColor are pushed via the second effect's `set` call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation]);

  // Keep the board in sync with FEN / last-move / drawable / viewer
  // changes. Always send a complete `movable` object — passing
  // `movable: undefined` makes chessground replace state.movable with
  // undefined and trips the destroy path.
  useEffect(() => {
    if (!apiRef.current) return;
    apiRef.current.set({
      fen,
      turnColor: turnFromFen(fen),
      lastMove: toLastMove(lastMove),
      movable: {
        color: viewerColor ?? undefined,
        dests: viewerColor ? legalDests(fen) : new Map(),
      },
      drawable: { autoShapes: drawables.map(toShape) },
    });
  }, [fen, lastMove, drawables, viewerColor]);

  return (
    <div
      ref={ref}
      className="cg-wrap aspect-square w-full max-w-[560px] overflow-hidden rounded-lg border border-edge"
    />
  );
}

function turnFromFen(fen: string): Color {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

function legalDests(fen: string): Map<Key, Key[]> {
  const map = new Map<Key, Key[]>();
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return map;
  }
  for (const sq of SQUARES) {
    try {
      const moves = chess.moves({ square: sq, verbose: true });
      if (moves.length > 0) {
        map.set(sq as Key, moves.map((m) => m.to as Key));
      }
    } catch {
      // chess.js throws on illegal squares — ignore.
    }
  }
  return map;
}

function needsPromotion(fen: string, orig: Key, dest: Key): boolean {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return false;
  }
  const piece = chess.get(orig as Parameters<typeof chess.get>[0]);
  if (!piece || piece.type !== "p") return false;
  const rank = (dest as string)[1];
  return rank === "8" || rank === "1";
}

function toShape(d: { orig: string; dest: string; brush?: string }) {
  return { orig: d.orig as Key, dest: d.dest as Key, brush: d.brush ?? "blue" };
}

function toLastMove(lm: [string, string] | null | undefined): Key[] | undefined {
  if (!lm) return undefined;
  return [lm[0] as Key, lm[1] as Key];
}
