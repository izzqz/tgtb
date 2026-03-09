import assert from "node:assert/strict";
import { test } from "node:test";

import tgtb from "../src/mod.ts";
import { randomOAuthUser, signOAuthUser } from "../src/utils/test-utils.ts";
import type { TelegramOAuthUser } from "../src/types/telegram.ts";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

test("validate_oauth", async (t) => {
  const client = tgtb(BOT_TOKEN);

  await t.test("validate random user data", async () => {
    const user = await randomOAuthUser(BOT_TOKEN);
    await client.oauth.validate(user);
    assert.deepStrictEqual(await client.oauth.isValid(user), true);
  });

  await t.test("reject missing hash field", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
    } as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(user),
    );
    assert.deepStrictEqual(await client.oauth.isValid(user), false);
  });

  await t.test("reject empty hash", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "",
    } as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(user),
    );
    assert.deepStrictEqual(await client.oauth.isValid(user), false);
  });

  await t.test("reject empty oauth_user", async () => {
    const user = {} as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(user),
    );
    assert.deepStrictEqual(await client.oauth.isValid(user), false);
  });

  await t.test("reject nullish oauth_user", async () => {
    const user = null as unknown as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(user),
    );
    assert.deepStrictEqual(await client.oauth.isValid(user), false);
  });

  await t.test("reject non-hex hash characters", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "xyz123",
    } as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(user),
    );
    assert.deepStrictEqual(await client.oauth.isValid(user), false);
  });

  await t.test("reject incorrect hash length", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "abc123",
    } as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(user),
    );
    assert.deepStrictEqual(await client.oauth.isValid(user), false);
  });

  await t.test("reject hash verification failure", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "0".repeat(64),
    } as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(user),
    );
    assert.deepStrictEqual(await client.oauth.isValid(user), false);
  });

  await t.test("handle large input data", async () => {
    const user = {
      id: 123456789,
      first_name: "A".repeat(1000),
      last_name: "B".repeat(1000),
      username: "C".repeat(100),
      auth_date: 1234567890,
      hash: "0".repeat(64),
    } as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(user),
    );
    assert.deepStrictEqual(await client.oauth.isValid(user), false);
  });

  await t.test("handle special characters in user data", async () => {
    const fixedNow = 1707000000000;
    const auth_date = Math.floor(fixedNow / 1000);
    const user = await signOAuthUser(BOT_TOKEN, {
      id: 123456789,
      first_name: "John & Jane",
      last_name: "O'Doe=Smith",
      username: "john.doe+test",
      photo_url: "https://example.com/photo+test.jpg",
      auth_date,
    });

    await client.oauth.validate(user);
    assert.deepStrictEqual(await client.oauth.isValid(user), true);
  });

  await t.test("return false for invalid user data in isValid", async () => {
    const invalidUser = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "invalid",
    } as TelegramOAuthUser;

    await assert.rejects(
      () => client.oauth.validate(invalidUser),
    );
    assert.deepStrictEqual(await client.oauth.isValid(invalidUser), false);
  });

  await t.test("return true from validate for valid data", async () => {
    const fixedNow = 1707000000000;
    const auth_date = Math.floor(fixedNow / 1000);
    const user = await signOAuthUser(BOT_TOKEN, {
      id: 123456789,
      first_name: "Test",
      auth_date,
    });

    await client.oauth.validate(user);
    assert.deepStrictEqual(await client.oauth.isValid(user), true);
  });

  await t.test("expiration tests", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: 1707000000000 });
    const baseUser = {
      id: 123456789,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
    };

    await t.test("accept non-expired data with expiration set", async () => {
      const auth_date = Math.floor(Date.now() / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: 3600 });

      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);

      t.mock.timers.tick(1800 * 1000);
      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);

      t.mock.timers.tick(1860 * 1000);
      await assert.rejects(() => client.oauth.validate(user));
      assert.deepStrictEqual(await client.oauth.isValid(user), false);
    });

    await t.test("not expire when expires_in is 0", async () => {
      const auth_date = Math.floor(Date.now() / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: 0 });

      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);

      t.mock.timers.tick(365 * 24 * 60 * 60 * 1000);
      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);
    });

    await t.test("not expire when expires_in is null", async () => {
      const auth_date = Math.floor(Date.now() / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: null });

      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);

      t.mock.timers.tick(365 * 24 * 60 * 60 * 1000);
      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);
    });

    await t.test("not expire when expires_in is undefined", async () => {
      const auth_date = Math.floor(Date.now() / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date,
      });

      const client = tgtb(BOT_TOKEN);

      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);

      t.mock.timers.tick(365 * 24 * 60 * 60 * 1000);
      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);
    });

    await t.test("expire exactly at expiration time", async () => {
      const startTime = Math.floor(Date.now() / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date: startTime,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: 60 });

      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);

      t.mock.timers.tick(59 * 1000);
      await client.oauth.validate(user);
      assert.deepStrictEqual(await client.oauth.isValid(user), true);

      t.mock.timers.tick(1000);
      await assert.rejects(() => client.oauth.validate(user));
      assert.deepStrictEqual(await client.oauth.isValid(user), false);
    });
  });
});
