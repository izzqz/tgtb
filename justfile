default:
    @just --list

test:
    cd rs_lib && wasm-pack test --node
    deno test

wasm-test:
    cd rs_lib && wasm-pack test --node -- --coverage-provider=v8

lint:
    cargo clippy

fmt:
    cargo fmt --all
    deno fmt

fix:
    cd rs_lib && cargo clippy --fix
    cd rs_lib && cargo fmt --all