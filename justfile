default:
    @just --list

test:
    cargo +nightly test --benches
    deno test

rs-test-coverage:
    CARGO_INCREMENTAL=0 \
    RUSTFLAGS="-C instrument-coverage" \
    LLVM_PROFILE_FILE="cargo-test-%p-%m.profraw" \
    cargo +nightly test --benches
    grcov rs_lib -s rs_lib --binary-path target/debug/ -t html --branch --ignore-not-existing -o coverage/