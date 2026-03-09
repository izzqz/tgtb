import assert from "node:assert/strict";
import { test } from "node:test";

import tgtb from "../src/mod.ts";
import { randomInitData, signInitData } from "../src/utils/test-utils.ts";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

test("validate_webapp", async (t) => {
  const client = tgtb(BOT_TOKEN);

  await t.test("validate random init data", async () => {
    const initData = await randomInitData(BOT_TOKEN);

    assert.deepStrictEqual(await client.init_data.validate(initData), undefined);
    assert.deepStrictEqual(await client.init_data.isValid(initData), true);
  });

  await t.test("reject hash mismatch", async () => {
    const initData = "query_id=test&user=test&hash=" + "0".repeat(64);

    await assert.rejects(
      () => client.init_data.validate(initData),
      { message: "hash mismatch" },
    );
  });

  await t.test("reject empty init data", async () => {
    await assert.rejects(
      () => client.init_data.validate(""),
      { message: "init_data is nullish" },
    );
  });

  await t.test("reject missing hash field", async () => {
    const auth_date = Math.floor(Date.now() / 1000);
    const initData = await signInitData(BOT_TOKEN, {
      user: { id: 123456789 },
      query_id: "test123",
      auth_date,
    });
    const noHashData = initData.split("&").filter((p) => !p.startsWith("hash="))
      .join("&");

    await assert.rejects(
      () => client.init_data.validate(noHashData),
    );
  });

  await t.test("reject empty hash", async () => {
    const initData = "query_id=test&hash=";

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("reject non-hex hash characters", async () => {
    const initData = "query_id=test&hash=xyz123";

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("reject incorrect hash length", async () => {
    const initData = "query_id=test&hash=abc123";

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("reject malformed query pair", async () => {
    const initData = "query_id&user=test&hash=" + "a".repeat(64);

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("reject invalid URL encoding", async () => {
    const initData = "query_id=test&user=%invalid%&hash=" + "0".repeat(64);

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("handle large input data", async () => {
    const largeUser = {
      id: 123456789,
      first_name: "A".repeat(1000),
      last_name: "B".repeat(1000),
      username: "C".repeat(100),
    };
    const auth_date = Math.floor(Date.now() / 1000);
    const initData = await signInitData(BOT_TOKEN, {
      user: largeUser,
      query_id: "test123",
      auth_date,
    });

    assert.deepStrictEqual(await client.init_data.validate(initData), undefined);
  });

  await t.test("validate structured data with valid hash", async () => {
    const auth_date = Math.floor(Date.now() / 1000);
    const initData = await signInitData(BOT_TOKEN, {
      user: {
        id: 123456789,
        first_name: "Test",
        last_name: "User",
        username: "testuser",
        language_code: "en",
      },
      query_id: "test123",
      auth_date,
    });

    assert.deepStrictEqual(await client.init_data.validate(initData), undefined);
  });

  await t.test("reject hash as first parameter", async () => {
    const initData = `hash=${"0".repeat(64)}&auth_date=123`;

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("reject parameters after hash", async () => {
    const initData = `auth_date=123&hash=${"0".repeat(64)}&foo=bar`;

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("handle case-insensitive key sorting", async () => {
    const initData = `B=2&a=1&hash=${"0".repeat(64)}`;

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("return false for invalid init data in isValid", async () => {
    const invalidData = "invalid_data";
    assert.deepStrictEqual(await client.init_data.isValid(invalidData), false);
  });

  await t.test("return true from validate for valid data", async () => {
    const auth_date = Math.floor(Date.now() / 1000);
    const validData = await signInitData(BOT_TOKEN, {
      user: { id: 123456789, first_name: "Test" },
      query_id: "test123",
      auth_date,
    });
    assert.deepStrictEqual(await client.init_data.validate(validData), undefined);
  });

  await t.test("handle encoded special characters", async () => {
    const initData = `key%3D=value%26&hash=${"0".repeat(64)}`;

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("handle empty key or value", async () => {
    const initData = `=value&key=&hash=${"0".repeat(64)}`;

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("handle multiple equals in pair", async () => {
    const initData = `key=val=ue&hash=${"0".repeat(64)}`;

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("reject multiple hash parameters", async () => {
    const initData = `hash=invalid&hash=${"0".repeat(64)}`;

    await assert.rejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.test("expiration tests", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: 1707000000000 });
    const user = {
      id: 123456789,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
    };

    await t.test("accept non-expired data with expiration set", async () => {
      const auth_date = Math.floor(Date.now() / 1000);
      const initData = await signInitData(BOT_TOKEN, {
        user,
        query_id: "test123",
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: 3600 });

      assert.deepStrictEqual(await client.init_data.isValid(initData), true);

      t.mock.timers.tick(1800 * 1000); // 30 minutes
      assert.deepStrictEqual(await client.init_data.isValid(initData), true);

      t.mock.timers.tick(1860 * 1000); // Another 31 minutes (total 61 minutes)
      assert.deepStrictEqual(await client.init_data.isValid(initData), false);
      await assert.rejects(
        () => client.init_data.validate(initData),
        { message: "hash expired" },
      );
    });

    await t.test("not expire when expires_in is 0", async () => {
      const auth_date = Math.floor(Date.now() / 1000);
      const initData = await signInitData(BOT_TOKEN, {
        user,
        query_id: "test123",
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: 0 });

      assert.deepStrictEqual(await client.init_data.isValid(initData), true);

      t.mock.timers.tick(365 * 24 * 60 * 60 * 1000);
      assert.deepStrictEqual(await client.init_data.isValid(initData), true);
    });

    await t.test("not expire when expires_in is null", async () => {
      const auth_date = Math.floor(Date.now() / 1000);
      const initData = await signInitData(BOT_TOKEN, {
        user,
        query_id: "test123",
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: null });

      assert.deepStrictEqual(await client.init_data.isValid(initData), true);

      t.mock.timers.tick(365 * 24 * 60 * 60 * 1000);
      assert.deepStrictEqual(await client.init_data.isValid(initData), true);
    });

    await t.test("not expire when expires_in is undefined", async () => {
      const auth_date = Math.floor(Date.now() / 1000);
      const initData = await signInitData(BOT_TOKEN, {
        user,
        query_id: "test123",
        auth_date,
      });

      const client = tgtb(BOT_TOKEN);

      assert.deepStrictEqual(await client.init_data.isValid(initData), true);

      t.mock.timers.tick(365 * 24 * 60 * 60 * 1000);
      assert.deepStrictEqual(await client.init_data.isValid(initData), true);
    });
  });
});
