default:
    @just --list

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

# test wasm in different browsers
[working-directory: 'rs_lib']
test-wasm:
    wasm-pack test --node

test:
    deno test --trace-leaks --check --parallel --reporter=pretty

test-coverage:
    deno test --coverage --parallel --reporter=dot
    deno coverage --include=src

build-doc:
    deno doc --html --name="@izzqz/tgtb" src
