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

# test wasm
[working-directory: 'rs_lib']
test-wasm:
    wasm-pack test --node

# run tests for deno
test:
    deno test --trace-leaks --check --parallel --reporter=dot

# generate coverage report
test-coverage:
    @rm -rf coverage
    deno test --coverage --parallel --reporter=dot
    deno coverage --include=src --detailed

# build tsdoc documentation
build-doc:
    deno doc --html --name="@izzqz/tgtb" src

get-types-versions:
    GH_PAGER= gh api repos/grammyjs/types/tags --jq '.[0].name'
    GH_PAGER= gh api repos/DavisDmitry/telegram-webapps/tags --jq '.[0].name'