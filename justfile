_default:
    @just --list

# lint and type check
lint:
    deno check src --all --doc
    deno lint src
    deno fmt --check src

# format files
fmt:
    deno fmt

# run tests for deno
test:
    deno test --trace-leaks --check --parallel --reporter=pretty

# generate coverage report
test-coverage:
    @rm -rf coverage
    deno test --coverage --parallel --reporter=dot
    deno coverage --include=src --detailed

# build tsdoc documentation
build-doc:
    deno doc --html --name="@izzqz/tgtb" src
