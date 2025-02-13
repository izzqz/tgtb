default:
    @just --list

test:
    cd rs_lib && wasm-pack test --node
    deno test

wasm-test:
    cd rs_lib && wasm-pack test --node -- --coverage-provider=v8

# lint and type check
lint:
    cargo clippy
    deno check . --all
    deno lint
    deno fmt --check

# format files
fmt:
    cargo fmt --all
    cargo clippy --fix
    deno fmt
