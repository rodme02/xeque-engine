//! WebAssembly bridge for the xeque engine collection. The frontend imports
//! the package built by `wasm-pack build --target web` and drives a
//! [`Session`] from a Web Worker.
//!
//! Surface kept deliberately small: pick an engine, set a position, search
//! (with streaming `info` events), make a move, run perft. The frontend
//! never re-implements chess rules in JS — all legality goes through Rust.

#![allow(clippy::missing_safety_doc)]

#[cfg(target_arch = "wasm32")]
mod wasm {
    use serde::Serialize;
    use wasm_bindgen::prelude::*;
    use xeque_core::{Board, Engine, SearchInfo, SearchLimits, MATE_SCORE};
    use xeque_engines as engines;

    #[wasm_bindgen(start)]
    pub fn _start() {
        console_error_panic_hook::set_once();
    }

    /// Stable list of engine ids (mirrors [`xeque_engines::ENGINE_IDS`]).
    #[wasm_bindgen(js_name = engineIds)]
    pub fn engine_ids() -> Vec<String> {
        engines::ENGINE_IDS
            .iter()
            .map(|s| (*s).to_string())
            .collect()
    }

    /// Side-effectful chess session — owns one engine instance plus a
    /// mutable board.
    #[wasm_bindgen]
    pub struct Session {
        engine: Box<dyn Engine>,
        board: Board,
    }

    #[derive(Serialize)]
    struct InfoJson {
        depth: u8,
        seldepth: u8,
        nodes: u64,
        #[serde(rename = "timeMs")]
        time_ms: u32,
        eval: i32,
        #[serde(rename = "mateIn")]
        mate_in: Option<i32>,
        pv: Vec<String>,
    }

    #[derive(Serialize)]
    struct ResultJson {
        #[serde(rename = "bestMove")]
        best_move: Option<String>,
        depth: u8,
        nodes: u64,
        #[serde(rename = "timeMs")]
        time_ms: u32,
        eval: i32,
        #[serde(rename = "mateIn")]
        mate_in: Option<i32>,
        pv: Vec<String>,
    }

    fn mate_in_from_eval(eval: i32) -> Option<i32> {
        if eval.abs() >= MATE_SCORE - 1024 {
            let plies = MATE_SCORE - eval.abs();
            Some(((plies + 1) / 2) * eval.signum())
        } else {
            None
        }
    }

    #[wasm_bindgen]
    impl Session {
        #[wasm_bindgen(constructor)]
        pub fn new(engine_id: &str) -> Result<Session, JsError> {
            let engine = engines::build(engine_id)
                .ok_or_else(|| JsError::new(&format!("unknown engine: {engine_id}")))?;
            Ok(Session {
                engine,
                board: Board::startpos(),
            })
        }

        #[wasm_bindgen(js_name = engineName)]
        pub fn engine_name(&self) -> String {
            self.engine.name().to_string()
        }

        #[wasm_bindgen(js_name = setStartpos)]
        pub fn set_startpos(&mut self) {
            self.board = Board::startpos();
        }

        #[wasm_bindgen(js_name = setFen)]
        pub fn set_fen(&mut self, fen: &str) -> Result<(), JsError> {
            self.board = Board::from_fen(fen).map_err(|e| JsError::new(&e.to_string()))?;
            Ok(())
        }

        pub fn fen(&self) -> String {
            self.board.fen()
        }

        #[wasm_bindgen(js_name = sideToMove)]
        pub fn side_to_move(&self) -> String {
            match self.board.side_to_move() {
                cozy_chess::Color::White => "white".to_string(),
                cozy_chess::Color::Black => "black".to_string(),
            }
        }

        #[wasm_bindgen(js_name = isGameOver)]
        pub fn is_game_over(&self) -> bool {
            self.board.is_game_over()
        }

        #[wasm_bindgen(js_name = isCheckmate)]
        pub fn is_checkmate(&self) -> bool {
            self.board.is_checkmate()
        }

        #[wasm_bindgen(js_name = isStalemate)]
        pub fn is_stalemate(&self) -> bool {
            self.board.is_stalemate()
        }

        #[wasm_bindgen(js_name = legalMoves)]
        pub fn legal_moves(&self) -> Vec<String> {
            self.board
                .legal_moves()
                .iter()
                .map(|m| m.to_string())
                .collect()
        }

        #[wasm_bindgen(js_name = makeMove)]
        pub fn make_move(&mut self, uci: &str) -> Result<(), JsError> {
            let mv = cozy_chess::util::parse_uci_move(self.board.inner(), uci)
                .map_err(|e| JsError::new(&format!("parse {uci}: {e}")))?;
            self.board
                .try_play(mv)
                .map_err(|e| JsError::new(&e.to_string()))
        }

        /// Run a search. `on_info` is invoked with a JSON object for every
        /// progress report the engine emits.
        pub fn search(
            &mut self,
            depth: Option<u8>,
            time_ms: Option<u32>,
            on_info: &js_sys::Function,
        ) -> Result<JsValue, JsError> {
            let limits = SearchLimits {
                max_depth: depth,
                max_time_ms: time_ms,
                max_nodes: None,
            };
            let mut last_info: Option<SearchInfo> = None;
            let result = self.engine.search(&self.board, limits, &mut |info| {
                let payload = InfoJson {
                    depth: info.depth,
                    seldepth: info.seldepth,
                    nodes: info.nodes,
                    time_ms: info.time_ms,
                    eval: info.eval,
                    mate_in: mate_in_from_eval(info.eval),
                    pv: info.pv.iter().map(|m| m.to_string()).collect(),
                };
                if let Ok(js) = serde_wasm_bindgen::to_value(&payload) {
                    let _ = on_info.call1(&JsValue::NULL, &js);
                }
                last_info = Some(info.clone());
            });
            let _ = last_info; // kept for future use
            let payload = ResultJson {
                best_move: result.best_move.map(|m| m.to_string()),
                depth: result.depth,
                nodes: result.nodes,
                time_ms: result.time_ms,
                eval: result.eval,
                mate_in: mate_in_from_eval(result.eval),
                pv: result.pv.iter().map(|m| m.to_string()).collect(),
            };
            serde_wasm_bindgen::to_value(&payload).map_err(JsError::from)
        }

        /// Perft on the current position. Used by the dashboard.
        pub fn perft(&self, depth: u8) -> u64 {
            perft_impl(&self.board, depth)
        }
    }

    fn perft_impl(board: &Board, depth: u8) -> u64 {
        if depth == 0 {
            return 1;
        }
        let moves = board.legal_moves();
        if depth == 1 {
            return moves.len() as u64;
        }
        let mut total = 0;
        for mv in moves {
            let mut next = board.clone();
            next.play(mv);
            total += perft_impl(&next, depth - 1);
        }
        total
    }
}
