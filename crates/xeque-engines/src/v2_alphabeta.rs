//! v2_alphabeta — fixed-depth negamax with **alpha-beta pruning** and the
//! same material-only evaluation as v1.
//!
//! αβ is exact: at the root it returns the same evaluation as pure
//! minimax. The win is purely in nodes visited — it skips branches the
//! opponent would never let us reach. With perfect move ordering αβ
//! evaluates `O(b^(d/2))` nodes vs minimax's `O(b^d)`. Even without
//! deliberate move ordering (which arrives in v3), the prune is
//! substantial: at depth 4 from the start position v1 visits ~206k
//! nodes; v2 visits ~2k — about 100× fewer for an identical eval.
//!
//! Reference: <https://www.chessprogramming.org/Alpha-Beta>

use cozy_chess::{Color, Move, Piece};
use web_time::Instant;
use xeque_core::{Board, Cp, Engine, SearchInfo, SearchLimits, SearchResult, MATE_SCORE};

const DEFAULT_DEPTH: u8 = 5;

pub struct AlphaBeta {
    default_depth: u8,
    nodes: u64,
}

impl AlphaBeta {
    pub fn new(default_depth: u8) -> Self {
        Self {
            default_depth,
            nodes: 0,
        }
    }
}

impl Default for AlphaBeta {
    fn default() -> Self {
        Self::new(DEFAULT_DEPTH)
    }
}

impl Engine for AlphaBeta {
    fn name(&self) -> &'static str {
        "v2_alphabeta"
    }

    fn search(
        &mut self,
        board: &Board,
        limits: SearchLimits,
        on_info: &mut dyn FnMut(&SearchInfo),
    ) -> SearchResult {
        let depth = limits.max_depth.unwrap_or(self.default_depth).max(1);
        self.nodes = 0;
        let started = Instant::now();

        let mut best_move: Option<Move> = None;
        // Root window is wide-open; tight windows happen recursively.
        let mut alpha: Cp = -MATE_SCORE - 1;
        let beta: Cp = MATE_SCORE + 1;

        for mv in board.legal_moves() {
            let mut next = board.clone();
            next.play(mv);
            let score = -negamax_ab(&next, depth - 1, 1, -beta, -alpha, &mut self.nodes);
            if score > alpha {
                alpha = score;
                best_move = Some(mv);
            }
        }

        let time_ms = started.elapsed().as_millis() as u32;
        let pv = best_move.map(|m| vec![m]).unwrap_or_default();
        let info = SearchInfo {
            depth,
            seldepth: depth,
            nodes: self.nodes,
            time_ms,
            eval: alpha,
            pv: pv.clone(),
        };
        on_info(&info);

        SearchResult {
            best_move,
            eval: alpha,
            depth,
            nodes: self.nodes,
            time_ms,
            pv,
        }
    }
}

fn negamax_ab(board: &Board, depth: u8, ply: u16, mut alpha: Cp, beta: Cp, nodes: &mut u64) -> Cp {
    *nodes += 1;

    if board.is_checkmate() {
        // Mate-distance encoding so the engine prefers the shortest mate.
        return -(MATE_SCORE - ply as Cp);
    }
    if board.is_stalemate() {
        return 0;
    }
    if depth == 0 {
        return evaluate(board);
    }

    for mv in board.legal_moves() {
        let mut next = board.clone();
        next.play(mv);
        let score = -negamax_ab(&next, depth - 1, ply + 1, -beta, -alpha, nodes);
        if score >= beta {
            // β-cutoff: opponent has a refutation, no need to explore further.
            return beta;
        }
        if score > alpha {
            alpha = score;
        }
    }
    alpha
}

/// Material-only evaluation (same as v1) from the side-to-move's POV.
/// Duplicated rather than shared so each engine version is a frozen
/// artifact — see the engine-progression rule in docs/ENGINES.md.
fn evaluate(board: &Board) -> Cp {
    use xeque_core::Color::*;
    let inner = board.inner();
    let score = material(inner, White) - material(inner, Black);
    if board.side_to_move() == White {
        score
    } else {
        -score
    }
}

fn material(board: &cozy_chess::Board, color: Color) -> Cp {
    use xeque_core::eval::material::*;
    let pieces = |p: Piece| board.colored_pieces(color, p).len() as Cp;
    pieces(Piece::Pawn) * PAWN
        + pieces(Piece::Knight) * KNIGHT
        + pieces(Piece::Bishop) * BISHOP
        + pieces(Piece::Rook) * ROOK
        + pieces(Piece::Queen) * QUEEN
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::v1_minimax::Minimax;

    #[test]
    fn finds_mate_in_one() {
        let board = Board::from_fen("7k/5K2/6Q1/8/8/8/8/8 w - - 0 1").unwrap();
        let mut e = AlphaBeta::new(2);
        let result = e.search(&board, SearchLimits::depth(2), &mut |_| {});
        let mv = result.best_move.expect("must find a move");
        assert!(
            result.eval >= MATE_SCORE - 10,
            "eval {} should be mate-level",
            result.eval
        );
        let mut after = board.clone();
        after.play(mv);
        assert!(after.is_checkmate(), "{mv} did not produce checkmate");
    }

    #[test]
    fn returns_a_legal_move_from_startpos_at_depth_3() {
        let board = Board::startpos();
        let mut e = AlphaBeta::new(3);
        let result = e.search(&board, SearchLimits::depth(3), &mut |_| {});
        let mv = result.best_move.expect("startpos has 20 moves");
        assert!(board.is_legal(mv));
    }

    /// At a given depth, αβ must return the exact same root evaluation as
    /// pure minimax — and it must visit strictly fewer nodes. Both
    /// properties are the whole point of αβ.
    #[test]
    fn matches_minimax_eval_with_fewer_nodes() {
        let board = Board::startpos();
        let mut mm = Minimax::new(4);
        let mut ab = AlphaBeta::new(4);
        let mm_res = mm.search(&board, SearchLimits::depth(4), &mut |_| {});
        let ab_res = ab.search(&board, SearchLimits::depth(4), &mut |_| {});
        assert_eq!(mm_res.eval, ab_res.eval, "αβ root eval must match minimax",);
        assert!(
            ab_res.nodes < mm_res.nodes,
            "αβ visited {} nodes; minimax visited {} — αβ should prune",
            ab_res.nodes,
            mm_res.nodes,
        );
    }
}
