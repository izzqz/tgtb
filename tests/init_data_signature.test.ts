import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import tgtb from "../src/mod.ts";
import {
  TELEGRAM_ED25519_PUBLIC_KEY,
  TELEGRAM_TEST_ED25519_PUBLIC_KEY,
} from "../src/constants.ts";
import { fromHex } from "../src/utils/mod.ts";
import {
  generateEd25519KeyPair,
  randomInitData,
  signInitData,
} from "../src/utils/testing.ts";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

const run = promisify(execFile);
const ENTRY = fileURLToPath(new URL("../src/mod.ts", import.meta.url));

// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
const DOCS_BOT_TOKEN = "5768337691:AAH5YkoiEuPk8-FZa32hStHTqXiLPtAEhx8";
const DOCS_INIT_DATA =
  "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Vladislav%22%2C%22last_name%22%3A%22Kibenko%22%2C%22username%22%3A%22vdkfrost%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%7D&auth_date=1662771648&hash=c501b71e775f74ce10e377dea85a7ea24ecd640b223ea86dfe453e0eaed2e2b2";

// https://docs.telegram-mini-apps.com/platform/init-data#using-telegram-public-key
const DOCS_THIRD_PARTY_INIT_DATA =
  "user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Vladislav%20%2B%20-%20%3F%20%5C%2F%22%2C%22last_name%22%3A%22Kibenko%22%2C%22username%22%3A%22vdkfrost%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F4FPEE4tmP3ATHa57u6MqTDih13LTOiMoKoLDRG4PnSA.svg%22%7D&chat_instance=8134722200314281151&chat_type=private&auth_date=1733584787&hash=2174df5b000556d044f3f020384e879c8efcab55ddea2ced4eb752e93e7080d6&signature=zL-ucjNyREiHDE8aihFwpfR9aggP2xiAo3NSpfe-p7IbCisNlDKlo7Kb6G4D0Ao2mBrSgEk4maLSdv6MLIlADQ";

function without(init_data: string, ...keys: string[]): string {
  return init_data
    .split("&")
    .filter((param) => !keys.some((key) => param.startsWith(`${key}=`)))
    .join("&");
}

async function signedInitData(signature_key?: CryptoKey): Promise<string> {
  return await signInitData(
    BOT_TOKEN,
    {
      user: { id: 123456789, first_name: "Test" },
      query_id: "test123",
      auth_date: Math.floor(Date.now() / 1000),
    },
    { signature_key },
  );
}

test("init_data signature", async (t) => {
  const { public_key, private_key } = await generateEd25519KeyPair();

  await t.test("validate official Telegram hash vector", async () => {
    const client = tgtb(DOCS_BOT_TOKEN);

    assert.deepStrictEqual(
      await client.init_data.validate(DOCS_INIT_DATA),
      undefined,
    );
  });

  await t.test("validate official Telegram signature vector", async () => {
    const client = tgtb("7342037359:AAFakeTokenForThirdPartyValidation", {
      ed25519_public_key: TELEGRAM_ED25519_PUBLIC_KEY,
    });

    assert.deepStrictEqual(
      await client.init_data.validate(
        without(DOCS_THIRD_PARTY_INIT_DATA, "hash"),
      ),
      undefined,
    );
  });

  await t.test("validate data signed with a generated key", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = await signedInitData(private_key);

    assert.match(init_data, /&signature=[A-Za-z0-9_-]{86}&/);
    assert.deepStrictEqual(
      await client.init_data.validate(init_data),
      undefined,
    );
    assert.deepStrictEqual(await client.init_data.isValid(init_data), true);
  });

  await t.test("validate signature only data", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = without(await signedInitData(private_key), "hash");

    assert.deepStrictEqual(
      await client.init_data.validate(init_data),
      undefined,
    );
  });

  await t.test("padded signature", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = without(await signedInitData(private_key), "hash");
    const signature = new URLSearchParams(init_data).get("signature")!;

    assert.deepStrictEqual(
      await client.init_data.validate(
        without(init_data, "signature") + `&signature=${signature}==`,
      ),
      undefined,
    );
  });

  await t.test("accept data without signature when no key set", async () => {
    const client = tgtb(BOT_TOKEN);

    assert.deepStrictEqual(
      await client.init_data.validate(await signedInitData(private_key)),
      undefined,
    );
  });

  await t.test("accept hash only data with key set", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = await signedInitData();

    assert.deepStrictEqual(
      await client.init_data.validate(init_data),
      undefined,
    );
  });

  await t.test("reject signature only data without key", async () => {
    const client = tgtb(BOT_TOKEN);
    const init_data = without(await signedInitData(private_key), "hash");

    await assert.rejects(
      () => client.init_data.validate(init_data),
      { message: "no hash in init_data" },
    );
    assert.deepStrictEqual(await client.init_data.isValid(init_data), false);
  });

  await t.test("reject data without hash and signature", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = without(
      await signedInitData(private_key),
      "hash",
      "signature",
    );

    await assert.rejects(
      () => client.init_data.validate(init_data),
      { message: "no hash or signature in init_data" },
    );
  });

  await t.test("reject signature of another bot id", async () => {
    const client = tgtb("654321:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", {
      ed25519_public_key: public_key,
    });
    const init_data = await signedInitData(private_key);

    await assert.rejects(
      () => client.init_data.validate(init_data),
      { message: "signature mismatch" },
    );
  });

  await t.test("reject foreign public key", async () => {
    const foreign = await generateEd25519KeyPair();
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: foreign.public_key });
    const init_data = await signedInitData(private_key);

    await assert.rejects(
      () => client.init_data.validate(init_data),
      { message: "signature mismatch" },
    );
  });

  await t.test("reject tampered signature", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = await signedInitData(private_key);
    const signature = new URLSearchParams(init_data).get("signature")!;
    const tampered = signature[0] === "A" ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;

    await assert.rejects(
      () => client.init_data.validate(
        without(init_data, "signature") + `&signature=${tampered}`,
      ),
      { message: "signature mismatch" },
    );
  });

  await t.test("reject malformed signature", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = without(await signedInitData(private_key), "hash");

    await assert.rejects(
      () => client.init_data.validate(
        without(init_data, "signature") + "&signature=not%20base64!",
      ),
    );
    assert.deepStrictEqual(
      await client.init_data.isValid(
        without(init_data, "signature") + "&signature=not%20base64!",
      ),
      false,
    );
  });

  await t.test("reject tampered hash", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = await signedInitData();
    const hash = new URLSearchParams(init_data).get("hash")!;
    const tampered = hash[0] === "0" ? `1${hash.slice(1)}` : `0${hash.slice(1)}`;

    await assert.rejects(
      () => client.init_data.validate(
        without(init_data, "hash") + `&hash=${tampered}`,
      ),
      { message: "hash mismatch" },
    );
  });

  await t.test("reject tampered auth_date with valid signature", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = await signedInitData(private_key);

    await assert.rejects(
      () => client.init_data.validate(
        without(init_data, "user", "hash") + "&user=%7B%22id%22%3A1%7D",
      ),
      { message: "signature mismatch" },
    );
  });

  await t.test("expire signature only data", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: 1707000000000 });

    const client = tgtb(BOT_TOKEN, {
      ed25519_public_key: public_key,
      hash_expiration: 3600,
    });
    const init_data = without(await signedInitData(private_key), "hash");

    assert.deepStrictEqual(await client.init_data.isValid(init_data), true);

    t.mock.timers.tick(3600 * 1000);
    assert.deepStrictEqual(await client.init_data.isValid(init_data), false);
    await assert.rejects(
      () => client.init_data.validate(init_data),
      { message: "hash expired" },
    );
  });

  await t.test("sign random init data", async () => {
    const client = tgtb(BOT_TOKEN, { ed25519_public_key: public_key });
    const init_data = await randomInitData(BOT_TOKEN, {
      signature_key: private_key,
    });

    assert.deepStrictEqual(
      await client.init_data.validate(init_data),
      undefined,
    );
  });

  await t.test("telegram public keys", () => {
    assert.deepStrictEqual(fromHex(TELEGRAM_ED25519_PUBLIC_KEY).length, 32);
    assert.deepStrictEqual(fromHex(TELEGRAM_TEST_ED25519_PUBLIC_KEY).length, 32);
  });
});

test("init_data ed25519_public_key", async (t) => {
  await t.test("reject non hex key", () => {
    assert.throws(
      () => tgtb(BOT_TOKEN, { ed25519_public_key: "not-hex" }),
      { message: "invalid hex string" },
    );
  });

  await t.test("reject key of unexpected length", () => {
    assert.throws(
      () => tgtb(BOT_TOKEN, { ed25519_public_key: "aa".repeat(31) }),
      { message: "ed25519_public_key must be 32 bytes, got 31" },
    );
    assert.throws(
      () => tgtb(BOT_TOKEN, { ed25519_public_key: "aa".repeat(33) }),
      { message: "ed25519_public_key must be 32 bytes, got 33" },
    );
  });

  await t.test("reject odd length key", () => {
    assert.throws(
      () => tgtb(BOT_TOKEN, { ed25519_public_key: "a".repeat(63) }),
      { message: "invalid hex string" },
    );
  });

  await t.test("accept default and nullish key", async () => {
    const { private_key } = await generateEd25519KeyPair();

    for (const key of [undefined, null]) {
      const client = tgtb(BOT_TOKEN, { ed25519_public_key: key });
      const init_data = await signedInitData(private_key);

      assert.deepStrictEqual(await client.init_data.isValid(init_data), true);
    }
  });

  await t.test("not crash the process on malformed key", async () => {
    // A rejected key import must not escape as an unhandled rejection:
    // a bad key used to kill the process as soon as the client was created
    const source = `
      import tgtb from ${JSON.stringify(ENTRY)};
      const token = ${JSON.stringify(BOT_TOKEN)};
      try {
        tgtb(token, { ed25519_public_key: "aa".repeat(31) });
      } catch (error) {
        console.log(error.message);
      }
      tgtb(token, { ed25519_public_key: "e7bf".repeat(16) });
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log("alive");
    `;

    const { stdout } = await run(
      process.execPath,
      ["--input-type=module", "-e", source],
      { cwd: fileURLToPath(new URL("..", import.meta.url)) },
    );

    assert.deepStrictEqual(stdout.trim().split("\n"), [
      "ed25519_public_key must be 32 bytes, got 31",
      "alive",
    ]);
  });
});
