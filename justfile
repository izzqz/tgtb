_default:
    @just --list

prepare:
    pnpm install

lint:
    pnpm exec tsc --noEmit

build:
    pnpm exec tsc

release type='patch': prepare lint build
    #!/bin/bash
    set -euxo pipefail
    git diff-index --quiet HEAD -- || { echo "error: working tree is dirty"; exit 1; }
    cur_version=$(node -p "require('./package.json').version")
    new_version=$(semver increment {{ type }} "$cur_version")
    node -e "const fs=require('fs'),p=JSON.parse(fs.readFileSync('package.json'));p.version='$new_version';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
    git add package.json
    git commit -m "v$new_version"
    git push origin main
    gh release create "v$new_version" --generate-notes --draft --fail-on-no-commits
