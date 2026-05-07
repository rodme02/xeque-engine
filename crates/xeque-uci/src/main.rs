//! Minimal UCI protocol binary for the xeque engine collection. Selects an
//! engine from [`xeque_engines`] via `--engine <id>` and speaks UCI on
//! stdin/stdout. See <http://wbec-ridderkerk.nl/html/UCIProtocol.html>.

use std::io::{self, BufRead, Write};
use std::str::FromStr;

use xeque_core::{Board, SearchInfo, SearchLimits, MATE_SCORE};
use xeque_engines as engines;

const DEFAULT_ENGINE: &str = "v1_minimax";

fn main() -> io::Result<()> {
    let engine_id = parse_engine_arg().unwrap_or_else(|| DEFAULT_ENGINE.to_string());
    let mut engine = engines::build(&engine_id).unwrap_or_else(|| {
        eprintln!(
            "unknown engine {:?}; available: {}",
            engine_id,
            engines::ENGINE_IDS.join(", ")
        );
        std::process::exit(2);
    });

    let stdin = io::stdin();
    let mut stdout = io::stdout().lock();
    let mut board = Board::startpos();

    for line in stdin.lock().lines() {
        let line = line?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let mut parts = trimmed.split_whitespace();
        let cmd = parts.next().unwrap_or("");

        match cmd {
            "uci" => {
                writeln!(stdout, "id name xeque-engine ({})", engine.name())?;
                writeln!(stdout, "id author Rodrigo Medeiros")?;
                writeln!(stdout, "uciok")?;
            }
            "isready" => writeln!(stdout, "readyok")?,
            "ucinewgame" => board = Board::startpos(),
            "position" => {
                if let Some(new) = parse_position(trimmed) {
                    board = new;
                }
            }
            "go" => {
                let limits = parse_go(trimmed, board.side_to_move());
                let result = engine.search(&board, limits, &mut |info| {
                    let _ = write_info(&mut stdout, info);
                });
                if let Some(mv) = result.best_move {
                    writeln!(stdout, "bestmove {mv}")?;
                } else {
                    writeln!(stdout, "bestmove 0000")?;
                }
            }
            "stop" => {} // we don't run async searches yet
            "quit" => break,
            _ => {} // ignore unknown commands
        }
        stdout.flush()?;
    }

    Ok(())
}

fn parse_engine_arg() -> Option<String> {
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        if let Some(rest) = arg.strip_prefix("--engine=") {
            return Some(rest.to_string());
        }
        if arg == "--engine" {
            return args.next();
        }
    }
    None
}

fn parse_position(line: &str) -> Option<Board> {
    let rest = line.strip_prefix("position")?.trim();
    let (mut board, after) = if let Some(after) = rest.strip_prefix("startpos") {
        (Board::startpos(), after.trim())
    } else if let Some(after) = rest.strip_prefix("fen ") {
        // FEN is six space-separated fields. Find them.
        let fields: Vec<&str> = after.splitn(7, ' ').collect();
        if fields.len() < 6 {
            return None;
        }
        let fen = fields[..6].join(" ");
        let after = if fields.len() == 7 { fields[6] } else { "" };
        (Board::from_fen(&fen).ok()?, after)
    } else {
        return None;
    };

    if let Some(moves_part) = after.strip_prefix("moves") {
        for tok in moves_part.split_whitespace() {
            let mv = match cozy_chess::util::parse_uci_move(board.inner(), tok) {
                Ok(m) => m,
                Err(_) => return Some(board),
            };
            if board.try_play(mv).is_err() {
                break;
            }
        }
    }
    Some(board)
}

fn parse_go(line: &str, stm: cozy_chess::Color) -> SearchLimits {
    let mut limits = SearchLimits::default();
    let mut tokens = line.split_whitespace().skip(1);
    let mut wtime: Option<u32> = None;
    let mut btime: Option<u32> = None;
    let mut winc: u32 = 0;
    let mut binc: u32 = 0;
    let mut movetime: Option<u32> = None;
    let mut depth: Option<u8> = None;

    while let Some(tok) = tokens.next() {
        match tok {
            "depth" => depth = tokens.next().and_then(|v| u8::from_str(v).ok()),
            "movetime" => movetime = tokens.next().and_then(|v| u32::from_str(v).ok()),
            "wtime" => wtime = tokens.next().and_then(|v| u32::from_str(v).ok()),
            "btime" => btime = tokens.next().and_then(|v| u32::from_str(v).ok()),
            "winc" => {
                winc = tokens
                    .next()
                    .and_then(|v| u32::from_str(v).ok())
                    .unwrap_or(0)
            }
            "binc" => {
                binc = tokens
                    .next()
                    .and_then(|v| u32::from_str(v).ok())
                    .unwrap_or(0)
            }
            "infinite" => depth = Some(64),
            _ => {}
        }
    }

    if let Some(d) = depth {
        limits.max_depth = Some(d);
    }
    if let Some(t) = movetime {
        limits.max_time_ms = Some(t);
    } else if let (Some(remaining), inc) = match stm {
        cozy_chess::Color::White => (wtime, winc),
        cozy_chess::Color::Black => (btime, binc),
    } {
        // Crude: spend ~1/30 of remaining time, plus increment.
        let alloc = remaining / 30 + inc;
        limits.max_time_ms = Some(alloc.max(50));
    }
    limits
}

fn write_info(out: &mut impl Write, info: &SearchInfo) -> io::Result<()> {
    write!(
        out,
        "info depth {} seldepth {} nodes {} time {}",
        info.depth, info.seldepth, info.nodes, info.time_ms
    )?;
    if info.eval.abs() >= MATE_SCORE - 1024 {
        let plies = MATE_SCORE - info.eval.abs();
        let mate_in = ((plies + 1) / 2) * info.eval.signum();
        write!(out, " score mate {mate_in}")?;
    } else {
        write!(out, " score cp {}", info.eval)?;
    }
    if !info.pv.is_empty() {
        write!(out, " pv")?;
        for mv in &info.pv {
            write!(out, " {mv}")?;
        }
    }
    writeln!(out)
}
