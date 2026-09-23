import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

const HOOK = fileURLToPath(
  new URL("./fixtures/no-faker-hook.ts", import.meta.url),
);
const MODULE = fileURLToPath(new URL("../src/utils/testing.ts", import.meta.url));
const ENTRY = fileURLToPath(new URL("../src/utils/mod.ts", import.meta.url));

const fakerMessage =
  "@faker-js/faker is required by tgtb test utilities, install it with `npm i -D @faker-js/faker`";

async function runWithoutFaker(source: string): Promise<{
  stdout: string;
  stderr: string;
}> {
  return await run(
    process.execPath,
    ["--import", HOOK, "--input-type=module", "-e", source],
    { cwd: fileURLToPath(new URL("..", import.meta.url)) },
  );
}

test("missing @faker-js/faker", async (t) => {
  await t.test("import testing module without faker", async () => {
    const { stdout } = await runWithoutFaker(`
      const { randomBotId } = await import(${JSON.stringify(MODULE)});
      const { randomBotId: viaBarrel } = await import(${JSON.stringify(ENTRY)});
      console.log(typeof randomBotId, typeof viaBarrel);
    `);

    assert.deepStrictEqual(stdout.trim(), "function function");
  });

  await t.test("throw on faker usage", async () => {
    const { stdout } = await runWithoutFaker(`
      const { randomBotToken } = await import(${JSON.stringify(MODULE)});
      try {
        randomBotToken();
      } catch (error) {
        console.log(error.message);
      }
    `);

    assert.deepStrictEqual(stdout.trim(), fakerMessage);
  });
});
