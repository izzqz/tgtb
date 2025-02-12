default:
    @just list

update-types:
    deno run \
        --allow-write="./src/types/telegram.d.ts" \
        --allow-net="raw.githubusercontent.com" \
        scripts/update_types.ts
