import { assertEquals, assertRejects } from "jsr:@std/assert";
import tgtb from "@izzqz/tgtb";
import { FakeTime } from "jsr:@std/testing/time";
import { randomOAuthUser, signOAuthUser } from "../src/utils/test-utils.ts";
import type { TelegramOAuthUser } from "../src/types/telegram.ts";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

Deno.test("validate_oauth", async (t) => {
  const client = tgtb(BOT_TOKEN);

  await t.step("should validate random user data", async () => {
    using _time = new FakeTime(1707000000000);
    const user = await randomOAuthUser(BOT_TOKEN);
    await client.oauth.validate(user);
    assertEquals(await client.oauth.isValid(user), true);
  });

  await t.step("should reject missing hash field", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
    } as TelegramOAuthUser;

    await assertRejects(
      () => client.oauth.validate(user),
    );
    assertEquals(await client.oauth.isValid(user), false);
  });

  await t.step("should reject empty hash", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "",
    } as TelegramOAuthUser;

    await assertRejects(
      () => client.oauth.validate(user),
    );
    assertEquals(await client.oauth.isValid(user), false);
  });

  await t.step("should reject empty oauth_user", async () => {
    const user = {} as TelegramOAuthUser;

    await assertRejects(
      () => client.oauth.validate(user),
    );
    assertEquals(await client.oauth.isValid(user), false);
  });

  await t.step("should reject nullish oauth_user", async () => {
    const user = null as unknown as TelegramOAuthUser;

    await assertRejects(
      () => client.oauth.validate(user),
    );
    assertEquals(await client.oauth.isValid(user), false);
  });

  await t.step("should reject non-hex hash characters", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "xyz123",
    } as TelegramOAuthUser;

    await assertRejects(
      () => client.oauth.validate(user),
    );
    assertEquals(await client.oauth.isValid(user), false);
  });

  await t.step("should reject incorrect hash length", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "abc123",
    } as TelegramOAuthUser;

    await assertRejects(
      () => client.oauth.validate(user),
    );
    assertEquals(await client.oauth.isValid(user), false);
  });

  await t.step("should reject hash verification failure", async () => {
    const user = {
      id: 123456789,
      first_name: "Test",
      auth_date: 1234567890,
      hash: "0".repeat(64),
    } as TelegramOAuthUser;

    await assertRejects(
      () => client.oauth.validate(user),
    );
    assertEquals(await client.oauth.isValid(user), false);
  });

  await t.step("should handle large input data", async () => {
    const user = {
      id: 123456789,
      first_name: "A".repeat(1000),
      last_name: "B".repeat(1000),
      username: "C".repeat(100),
      auth_date: 1234567890,
      hash: "0".repeat(64),
    } as TelegramOAuthUser;

    await assertRejects(
      () => client.oauth.validate(user),
    );
    assertEquals(await client.oauth.isValid(user), false);
  });

  await t.step("should handle special characters in user data", async () => {
    using _time = new FakeTime(1707000000000);
    const auth_date = Math.floor(_time.now / 1000);
    const user = await signOAuthUser(BOT_TOKEN, {
      id: 123456789,
      first_name: "John & Jane",
      last_name: "O'Doe=Smith",
      username: "john.doe+test",
      photo_url: "https://example.com/photo+test.jpg",
      auth_date,
    });

    await client.oauth.validate(user);
    assertEquals(await client.oauth.isValid(user), true);
  });

  await t.step(
    "should return false for invalid user data in isValid",
    async () => {
      const invalidUser = {
        id: 123456789,
        first_name: "Test",
        auth_date: 1234567890,
        hash: "invalid",
      } as TelegramOAuthUser;

      await assertRejects(
        () => client.oauth.validate(invalidUser),
      );
      assertEquals(await client.oauth.isValid(invalidUser), false);
    },
  );

  await t.step("should return true from validate for valid data", async () => {
    using _time = new FakeTime(1707000000000);
    const auth_date = Math.floor(_time.now / 1000);
    const user = await signOAuthUser(BOT_TOKEN, {
      id: 123456789,
      first_name: "Test",
      auth_date,
    });

    await client.oauth.validate(user);
    assertEquals(await client.oauth.isValid(user), true);
  });

  await t.step("expiration tests", async (t) => {
    using time = new FakeTime(1707000000000); // Set initial time to a known value
    const baseUser = {
      id: 123456789,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
    };

    await t.step(
      "should accept non-expired data with expiration set",
      async () => {
        const auth_date = Math.floor(time.now / 1000); // Current time in seconds
        const user = await signOAuthUser(BOT_TOKEN, {
          ...baseUser,
          auth_date,
        });

        const client = tgtb(BOT_TOKEN, { hash_expiration: 3600 }); // 1 hour expiration

        // Check immediately - should be valid
        await client.oauth.validate(user);
        assertEquals(await client.oauth.isValid(user), true);

        // Move forward 30 minutes - should still be valid
        time.tick(1800 * 1000);
        await client.oauth.validate(user);
        assertEquals(await client.oauth.isValid(user), true);

        // Move forward another 31 minutes (total 61 minutes) - should be expired
        time.tick(1860 * 1000);
        await assertRejects(() => client.oauth.validate(user));
        assertEquals(await client.oauth.isValid(user), false);
      },
    );

    await t.step("should not expire when expires_in is 0", async () => {
      const auth_date = Math.floor(time.now / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: 0 });

      // Check immediately
      await client.oauth.validate(user);
      assertEquals(await client.oauth.isValid(user), true);

      // Move forward 1 year
      time.tick(365 * 24 * 60 * 60 * 1000);
      await client.oauth.validate(user);
      assertEquals(await client.oauth.isValid(user), true);
    });

    await t.step("should not expire when expires_in is null", async () => {
      const auth_date = Math.floor(time.now / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: null });

      // Check immediately
      await client.oauth.validate(user);
      assertEquals(await client.oauth.isValid(user), true);

      // Move forward 1 year
      time.tick(365 * 24 * 60 * 60 * 1000);
      await client.oauth.validate(user);
      assertEquals(await client.oauth.isValid(user), true);
    });

    await t.step("should not expire when expires_in is undefined", async () => {
      const auth_date = Math.floor(time.now / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date,
      });

      const client = tgtb(BOT_TOKEN); // No expires_in provided

      // Check immediately
      await client.oauth.validate(user);
      assertEquals(await client.oauth.isValid(user), true);

      // Move forward 1 year
      time.tick(365 * 24 * 60 * 60 * 1000);
      await client.oauth.validate(user);
      assertEquals(await client.oauth.isValid(user), true);
    });

    await t.step("should expire exactly at expiration time", async () => {
      const startTime = Math.floor(time.now / 1000);
      const user = await signOAuthUser(BOT_TOKEN, {
        ...baseUser,
        auth_date: startTime,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: 60 }); // 60 seconds expiration

      // Initial check - should be valid
      await client.oauth.validate(user);
      assertEquals(await client.oauth.isValid(user), true);

      // Move to 59 seconds - should still be valid
      time.tick(59 * 1000);
      await client.oauth.validate(user);
      assertEquals(await client.oauth.isValid(user), true);

      // Move to exactly 60 seconds - should be expired
      time.tick(1000);
      await assertRejects(() => client.oauth.validate(user));
      assertEquals(await client.oauth.isValid(user), false);
    });
  });
});
