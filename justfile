default:
    @just --list

test:
    cargo +nightly test --benches
    deno test

rs-test-coverage:
    # Clean previous coverage data
    rm -f *.profraw
    rm -rf coverage/
    
    # Run regular tests with coverage
    cd rs_lib && \
    CARGO_INCREMENTAL=0 \
    RUSTFLAGS="-C instrument-coverage" \
    LLVM_PROFILE_FILE="rust-%p-%m.profraw" \
    cargo test
    ;
    # Generate coverage report
    grcov . \
        -s rs_lib \
        --binary-path target/debug/ \
        -t html \
        --branch \
        --ignore-not-existing \
        -o coverage/

wasm-test:
    cd rs_lib && wasm-pack test --node

lint:
    cargo clippy -- -D warnings

fmt:
    cargo fmt --all -- --check

fix:
    cd rs_lib && cargo clippy --fix -- -D warnings
    cd rs_lib && cargo fmt --all