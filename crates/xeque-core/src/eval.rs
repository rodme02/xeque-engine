//! Evaluation primitives. Scores are centipawns from the side-to-move's
//! perspective.

/// Centipawn evaluation. Positive = side-to-move is winning.
pub type Cp = i32;

/// Sentinel score representing a forced mate. Mate-in-N is encoded as
/// `MATE_SCORE - N` so deeper mates score lower (we still prefer the
/// shortest mate).
pub const MATE_SCORE: Cp = 30_000;

/// Standard piece values used by the v1 material-only eval.
pub mod material {
    use super::Cp;
    pub const PAWN: Cp = 100;
    pub const KNIGHT: Cp = 320;
    pub const BISHOP: Cp = 330;
    pub const ROOK: Cp = 500;
    pub const QUEEN: Cp = 900;
}
