//! v1_minimax — fixed-depth negamax with material-only evaluation.
//!
//! No alpha-beta pruning, no move ordering, no quiescence. The point of
//! this engine is to be the *honest baseline* that v2_alphabeta later
//! measurably improves on. See:
//!   <https://www.chessprogramming.org/Negamax>
//!   <https://www.chessprogramming.org/Evaluation>

use cozy_chess::{Color, Move, Piece};
use web_time::Instant;
use xeque_core::{Board, Cp, Engine, SearchInfo, SearchLimits, SearchResult, MATE_SCORE};

const DEFAULT_DEPTH: u8 = 4;

pub struct Minimax {
    default_depth: u8,
    nodes: u64,
}

impl Minimax {
    pub fn new(default_depth: u8) -> Self {
        Self {
            default_depth,
            nodes: 0,
        }
    }
}

impl Default for Minimax {
    fn default() -> Self {
        Self::new(DEFAULT_DEPTH)
    }
}

impl Engine for Minimax {
    fn name(&self) -> &'static str {
        "v1_minimax"
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
        let mut best_score: Cp = -MATE_SCORE - 1;

        let moves = board.legal_moves();
        for mv in moves {
            let mut next = board.clone();
            next.play(mv);
            let score = -negamax(&next, depth - 1, 1, &mut self.nodes);
            if score > best_score {
                best_score = score;
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
            eval: best_score,
            pv: pv.clone(),
        };
        on_info(&info);

        SearchResult {
            best_move,
            eval: best_score,
            depth,
            nodes: self.nodes,
            time_ms,
            pv,
        }
    }
}

fn negamax(board: &Board, depth: u8, ply: u16, nodes: &mut u64) -> Cp {
    *nodes += 1;

    if board.is_checkmate() {
        // Side to move is mated. Encode mate-distance from the root so the
        // UCI layer can report `mate N` correctly: shallower mates score
        // higher, so the engine prefers the quickest mate.
        return -(MATE_SCORE - ply as Cp);
    }
    if board.is_stalemate() {
        return 0;
    }
    if depth == 0 {
        return evaluate(board);
    }

    let mut best = -MATE_SCORE - 1;
    for mv in board.legal_moves() {
        let mut next = board.clone();
        next.play(mv);
        let score = -negamax(&next, depth - 1, ply + 1, nodes);
        if score > best {
            best = score;
        }
    }
    best
}

/// Material-only evaluation, in centipawns, from the side-to-move's POV.
fn evaluate(board: &Board) -> Cp {
    use xeque_core::Color::*;
    let inner = board.inner();
    let mut score: Cp = 0;
    score += material(inner, White) - material(inner, Black);
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

    #[test]
    fn finds_mate_in_one() {
        // K+Q vs K with several mate-in-one options. Pure material minimax
        // is indifferent between them, so we only check that (a) the eval
        // is mate-level and (b) the chosen move actually delivers mate.
        let board = Board::from_fen("7k/5K2/6Q1/8/8/8/8/8 w - - 0 1").unwrap();
        let mut e = Minimax::new(2);
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
    fn returns_a_legal_move_from_startpos_at_depth_2() {
        let board = Board::startpos();
        let mut e = Minimax::new(2);
        let result = e.search(&board, SearchLimits::depth(2), &mut |_| {});
        let mv = result.best_move.expect("startpos has 20 moves");
        assert!(board.is_legal(mv));
    }
}
