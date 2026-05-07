//! v0_random — picks a uniformly random legal move. Baseline opponent and
//! the smoke test for the trait, the wasm bridge, and the UI plumbing.

use rand::rngs::SmallRng;
use rand::seq::SliceRandom;
use rand::SeedableRng;
use xeque_core::{Board, Engine, SearchInfo, SearchLimits, SearchResult};

pub struct Random {
    rng: SmallRng,
}

impl Random {
    pub fn new() -> Self {
        Self {
            rng: SmallRng::from_entropy(),
        }
    }

    pub fn from_seed(seed: u64) -> Self {
        Self {
            rng: SmallRng::seed_from_u64(seed),
        }
    }
}

impl Default for Random {
    fn default() -> Self {
        Self::new()
    }
}

impl Engine for Random {
    fn name(&self) -> &'static str {
        "v0_random"
    }

    fn search(
        &mut self,
        board: &Board,
        _limits: SearchLimits,
        _on_info: &mut dyn FnMut(&SearchInfo),
    ) -> SearchResult {
        let moves = board.legal_moves();
        let pick = moves.choose(&mut self.rng).copied();
        SearchResult {
            best_move: pick,
            eval: 0,
            depth: 0,
            nodes: moves.len() as u64,
            time_ms: 0,
            pv: pick.map(|m| vec![m]).unwrap_or_default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_a_legal_move_from_startpos() {
        let mut e = Random::from_seed(42);
        let board = Board::startpos();
        let result = e.search(&board, SearchLimits::default(), &mut |_| {});
        let mv = result.best_move.expect("startpos has legal moves");
        assert!(board.is_legal(mv));
    }

    #[test]
    fn returns_none_when_no_moves_available() {
        // Fool's mate: 1.f3 e5 2.g4 Qh4#  — black to move would have no moves
        // but let's use a known stalemate / mate FEN. King and pawn vs king
        // stalemate: 7k/5K2/6Q1/8/8/8/8/8 b - - 0 1
        let board = Board::from_fen("7k/5K2/6Q1/8/8/8/8/8 b - - 0 1").unwrap();
        let mut e = Random::from_seed(0);
        let result = e.search(&board, SearchLimits::default(), &mut |_| {});
        assert!(result.best_move.is_none());
    }
}
