//! The `Engine` trait — the spine of the project. Every engine version,
//! current and future, implements this. The UCI binary, WASM bindings, and
//! arena mode all consume engines through this trait alone.

use crate::board::Board;
use crate::eval::Cp;
use cozy_chess::Move;

/// Limits a single search call. At least one limit should be set; if all are
/// `None`, engines fall back to their default depth.
#[derive(Debug, Clone, Copy, Default)]
pub struct SearchLimits {
    pub max_depth: Option<u8>,
    pub max_time_ms: Option<u32>,
    pub max_nodes: Option<u64>,
}

impl SearchLimits {
    pub fn depth(d: u8) -> Self {
        Self {
            max_depth: Some(d),
            ..Self::default()
        }
    }

    pub fn time_ms(ms: u32) -> Self {
        Self {
            max_time_ms: Some(ms),
            ..Self::default()
        }
    }
}

/// A single progress report streamed during search. The engine emits these
/// at iteration boundaries (or whenever it has something useful to say) so
/// the UI can render live PV / depth / NPS.
#[derive(Debug, Clone)]
pub struct SearchInfo {
    pub depth: u8,
    pub seldepth: u8,
    pub nodes: u64,
    pub time_ms: u32,
    pub eval: Cp,
    pub pv: Vec<Move>,
}

/// Outcome of a search.
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub best_move: Option<Move>,
    pub eval: Cp,
    pub depth: u8,
    pub nodes: u64,
    pub time_ms: u32,
    pub pv: Vec<Move>,
}

/// The contract every engine implements.
///
/// `on_info` is called as the engine makes progress. It exists so the UI can
/// stream depth / NPS / PV without polling. Engines are free to call it once
/// per iteration, or never (e.g. v0_random).
pub trait Engine: Send {
    fn name(&self) -> &'static str;

    fn search(
        &mut self,
        board: &Board,
        limits: SearchLimits,
        on_info: &mut dyn FnMut(&SearchInfo),
    ) -> SearchResult;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn limits_helpers() {
        assert_eq!(SearchLimits::depth(4).max_depth, Some(4));
        assert_eq!(SearchLimits::time_ms(1000).max_time_ms, Some(1000));
    }
}
