//! Collection of chess engines. Each version is a self-contained module
//! implementing [`xeque_core::Engine`]. Older versions are never edited in
//! place — the progression is the portfolio.

pub mod v0_random;
pub mod v1_minimax;
pub mod v2_alphabeta;

use xeque_core::Engine;

/// Stable identifiers shown in the UI and on the UCI command line.
pub const ENGINE_IDS: &[&str] = &["v0_random", "v1_minimax", "v2_alphabeta"];

/// Build an engine by id. Returns `None` if the id is unknown.
pub fn build(id: &str) -> Option<Box<dyn Engine>> {
    match id {
        "v0_random" => Some(Box::new(v0_random::Random::new())),
        "v1_minimax" => Some(Box::new(v1_minimax::Minimax::new(4))),
        "v2_alphabeta" => Some(Box::new(v2_alphabeta::AlphaBeta::new(5))),
        _ => None,
    }
}
