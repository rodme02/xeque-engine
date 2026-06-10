//! Per-engine NPS benchmarks: a search from the start position at each
//! engine's default depth. Depth-bounded (not wall-clock), and node
//! counts are fixed per engine for the searching engines, so criterion's
//! throughput line (elem/s) reads directly as NPS. Iterates the
//! registry, so new engines are benched automatically.

use criterion::{criterion_group, criterion_main, Criterion, Throughput};
use xeque_core::{Board, SearchLimits};

fn search_startpos(c: &mut Criterion) {
    let mut group = c.benchmark_group("search_startpos_default_depth");
    group.sample_size(10);
    for &id in xeque_engines::ENGINE_IDS {
        // Untimed probe to learn the engine's fixed-depth node count so
        // the timed runs can report throughput in nodes/sec.
        // NOTE: v0_random is first in ENGINE_IDS and reports nodes > 0
        // (legal-move count). All searching engines (v1, v2, …) also
        // report real node counts. The `if nodes > 0` guard is a
        // defensive fallback; no engine is expected to report 0 today.
        // If a future engine legitimately reports 0 nodes it would
        // inherit the previous engine's throughput — restructure the
        // loop at that point.
        let mut probe = xeque_engines::build(id).expect("registered engine id");
        let nodes = probe
            .search(&Board::startpos(), SearchLimits::default(), &mut |_| {})
            .nodes;
        if nodes > 0 {
            group.throughput(Throughput::Elements(nodes));
        }
        group.bench_function(id, |b| {
            b.iter(|| {
                let mut engine = xeque_engines::build(id).expect("registered engine id");
                let board = Board::startpos();
                engine.search(&board, SearchLimits::default(), &mut |_| {})
            });
        });
    }
    group.finish();
}

criterion_group!(benches, search_startpos);
criterion_main!(benches);
