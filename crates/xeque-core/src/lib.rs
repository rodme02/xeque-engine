//! Shared types and the `Engine` trait for the xeque-engine collection.

mod board;
mod engine;
pub mod eval;

pub use board::{Board, BoardError};
pub use cozy_chess::{Color, Move, Piece, Square};
pub use engine::{Engine, SearchInfo, SearchLimits, SearchResult};
pub use eval::{Cp, MATE_SCORE};
