//! Position type. Currently a thin wrapper over [`cozy_chess::Board`] so
//! the rest of the engine talks to one stable type even if we swap movegen
//! later.

use cozy_chess::{Board as CozyBoard, Color, Move};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum BoardError {
    #[error("invalid FEN: {0}")]
    InvalidFen(String),
    #[error("illegal move {0} in current position")]
    IllegalMove(String),
}

#[derive(Debug, Clone)]
pub struct Board {
    inner: CozyBoard,
}

impl Board {
    pub fn startpos() -> Self {
        Self {
            inner: CozyBoard::default(),
        }
    }

    pub fn from_fen(fen: &str) -> Result<Self, BoardError> {
        CozyBoard::from_fen(fen, false)
            .map(|inner| Self { inner })
            .map_err(|e| BoardError::InvalidFen(e.to_string()))
    }

    pub fn fen(&self) -> String {
        format!("{}", self.inner)
    }

    pub fn side_to_move(&self) -> Color {
        self.inner.side_to_move()
    }

    pub fn legal_moves(&self) -> Vec<Move> {
        let mut moves = Vec::with_capacity(64);
        self.inner.generate_moves(|mvs| {
            moves.extend(mvs);
            false
        });
        moves
    }

    /// Apply a move. Panics on illegal moves — callers should validate via
    /// [`Self::is_legal`] first if input is untrusted.
    pub fn play(&mut self, mv: Move) {
        self.inner.play(mv);
    }

    pub fn try_play(&mut self, mv: Move) -> Result<(), BoardError> {
        if !self.is_legal(mv) {
            return Err(BoardError::IllegalMove(mv.to_string()));
        }
        self.inner.play(mv);
        Ok(())
    }

    pub fn is_legal(&self, mv: Move) -> bool {
        let mut legal = false;
        self.inner.generate_moves(|mvs| {
            if mvs.into_iter().any(|m| m == mv) {
                legal = true;
                return true;
            }
            false
        });
        legal
    }

    pub fn is_checkmate(&self) -> bool {
        matches!(self.inner.status(), cozy_chess::GameStatus::Won)
    }

    pub fn is_stalemate(&self) -> bool {
        matches!(self.inner.status(), cozy_chess::GameStatus::Drawn)
    }

    pub fn is_game_over(&self) -> bool {
        !matches!(self.inner.status(), cozy_chess::GameStatus::Ongoing)
    }

    pub fn inner(&self) -> &CozyBoard {
        &self.inner
    }
}

impl Default for Board {
    fn default() -> Self {
        Self::startpos()
    }
}

impl From<CozyBoard> for Board {
    fn from(inner: CozyBoard) -> Self {
        Self { inner }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn startpos_roundtrips() {
        let b = Board::startpos();
        let fen = b.fen();
        let b2 = Board::from_fen(&fen).unwrap();
        assert_eq!(b.fen(), b2.fen());
    }

    #[test]
    fn startpos_has_twenty_legal_moves() {
        let b = Board::startpos();
        assert_eq!(b.legal_moves().len(), 20);
    }

    #[test]
    fn rejects_garbage_fen() {
        assert!(Board::from_fen("not a fen").is_err());
    }
}
