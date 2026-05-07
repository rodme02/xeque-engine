/// In-browser Elo bookkeeping for arena mode. Standard logistic update,
/// K=32, base 1500. Persisted to localStorage so the leaderboard survives
/// reloads.

export type Outcome = "win" | "draw" | "loss"; // from the perspective of player A

const STORAGE_KEY = "xeque.elo.v1";
const BASE_RATING = 1500;
const K = 32;

export type RatingTable = Record<string, number>;

export function loadRatings(): RatingTable {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RatingTable;
  } catch {
    return {};
  }
}

export function saveRatings(table: RatingTable) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(table));
}

export function ratingOf(table: RatingTable, id: string): number {
  return table[id] ?? BASE_RATING;
}

export function expected(rA: number, rB: number): number {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

export function score(o: Outcome): number {
  return o === "win" ? 1 : o === "draw" ? 0.5 : 0;
}

/// Returns updated ratings for both players after a single game.
export function update(
  rA: number,
  rB: number,
  outcomeForA: Outcome,
): { rA: number; rB: number } {
  const eA = expected(rA, rB);
  const sA = score(outcomeForA);
  const newRa = rA + K * (sA - eA);
  const newRb = rB + K * ((1 - sA) - (1 - eA));
  return { rA: newRa, rB: newRb };
}

export function recordGame(
  table: RatingTable,
  a: string,
  b: string,
  outcomeForA: Outcome,
): RatingTable {
  const rA = ratingOf(table, a);
  const rB = ratingOf(table, b);
  const next = update(rA, rB, outcomeForA);
  return { ...table, [a]: next.rA, [b]: next.rB };
}

export function clearRatings() {
  localStorage.removeItem(STORAGE_KEY);
}
