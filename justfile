_default:
    @just --list

prepare:
    git submodule update --init --recursive
    deno cache .

# lint and type check
lint:
    deno check src tests --all --doc
    deno lint src tests
    deno fmt --check src tests

alias format := fmt

# format files
fmt:
    deno fmt src tests
    just --fmt --unstable

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

# create a version tag and github release
release type='patch': prepare lint test
    #!/bin/bash
    set -euxo pipefail
    git diff-index --quiet HEAD -- || {
        echo "error: working tree is dirty"
        exit 1
    }
    cur_version=$(jq -r '.version' deno.json)
    new_version=$(semver increment {{ type }} "$cur_version")
    jq ".version = \"$new_version\"" deno.json | sponge deno.json
    git add deno.json
    git commit -m "v$new_version"
    git push origin main
    gh release create "v$new_version" --generate-notes --draft --fail-on-no-commits
