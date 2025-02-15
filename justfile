default:
    @just --list

# lint and type check
lint:
    cargo clippy
    deno check . --all --doc
    deno lint
    deno fmt --check

# format files
fmt:
    cargo fmt --all
    cargo clippy --fix
    deno fmt

# build rust
wasmbuild:
    deno run -A jsr:@deno/wasmbuild@0.19

# test wasm in different browsers
[working-directory: 'rs_lib']
test-wasm:
    wasm-pack test --node

test:
    deno test --trace-leaks --check --parallel --reporter=dot

test-coverage:
    @rm -rf coverage
    deno test --coverage --parallel --reporter=dot
    deno coverage --include=src --detailed

build-doc:
    deno doc --html --name="@izzqz/tgtb" src
