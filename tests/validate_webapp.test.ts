import { assertEquals, assertRejects } from "jsr:@std/assert";
import tgtb from "@izzqz/tgtb";
import { FakeTime } from "jsr:@std/testing/time";
import { randomInitData, signInitData } from "../src/utils/test-utils.ts";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

Deno.test("validate_webapp", async (t) => {
  const client = tgtb(BOT_TOKEN);

  await t.step("should validate random init data", async () => {
    const initData = await randomInitData(BOT_TOKEN);

    assertEquals(await client.init_data.validate(initData), undefined);
    assertEquals(await client.init_data.isValid(initData), true);
  });

  await t.step("should reject hash mismatch", () => {
    const initData = "query_id=test&user=test&hash=" + "0".repeat(64);

    assertRejects(
      () => client.init_data.validate(initData),
      Error,
      "hash mismatch",
    );
  });

  await t.step("should reject empty init data", () => {
    assertRejects(
      () => client.init_data.validate(""),
      Error,
      "init_data is nullish",
    );
  });

  await t.step("should reject missing hash field", async () => {
    const auth_date = Math.floor(Date.now() / 1000);
    const initData = await signInitData(BOT_TOKEN, {
      user: { id: 123456789 },
      query_id: "test123",
      auth_date,
    });
    const noHashData = initData.split("&").filter((p) => !p.startsWith("hash="))
      .join("&");

    assertRejects(
      () => client.init_data.validate(noHashData),
    );
  });

  await t.step("should reject empty hash", () => {
    const initData = "query_id=test&hash=";

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should reject non-hex hash characters", () => {
    const initData = "query_id=test&hash=xyz123";

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should reject incorrect hash length", () => {
    const initData = "query_id=test&hash=abc123";

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should reject malformed query pair", () => {
    const initData = "query_id&user=test&hash=" + "a".repeat(64);

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should reject invalid URL encoding", () => {
    const initData = "query_id=test&user=%invalid%&hash=" + "0".repeat(64);

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should handle large input data", async () => {
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

    assertEquals(await client.init_data.validate(initData), undefined);
  });

  await t.step("should validate structured data with valid hash", async () => {
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

    assertEquals(await client.init_data.validate(initData), undefined);
  });

  await t.step("should reject hash as first parameter", () => {
    const initData = `hash=${"0".repeat(64)}&auth_date=123`;

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should reject parameters after hash", () => {
    const initData = `auth_date=123&hash=${"0".repeat(64)}&foo=bar`;

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should handle case-insensitive key sorting", () => {
    const initData = `B=2&a=1&hash=${"0".repeat(64)}`;

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step(
    "should return false for invalid init data in isValid",
    async () => {
      const invalidData = "invalid_data";
      assertEquals(await client.init_data.isValid(invalidData), false);
    },
  );

  await t.step("should return true from validate for valid data", async () => {
    const auth_date = Math.floor(Date.now() / 1000);
    const validData = await signInitData(BOT_TOKEN, {
      user: { id: 123456789, first_name: "Test" },
      query_id: "test123",
      auth_date,
    });
    assertEquals(await client.init_data.validate(validData), undefined);
  });

  await t.step("should handle encoded special characters", () => {
    const initData = `key%3D=value%26&hash=${"0".repeat(64)}`;

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should handle empty key or value", () => {
    const initData = `=value&key=&hash=${"0".repeat(64)}`;

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should handle multiple equals in pair", () => {
    const initData = `key=val=ue&hash=${"0".repeat(64)}`;

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("should reject multiple hash parameters", () => {
    const initData = `hash=invalid&hash=${"0".repeat(64)}`;

    assertRejects(
      () => client.init_data.validate(initData),
    );
  });

  await t.step("expiration tests", async (t) => {
    using time = new FakeTime(1707000000000);
    const user = {
      id: 123456789,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
    };

    await t.step(
      "should accept non-expired data with expiration set",
      async () => {
        const auth_date = Math.floor(time.now / 1000);
        const initData = await signInitData(BOT_TOKEN, {
          user,
          query_id: "test123",
          auth_date,
        });

        const client = tgtb(BOT_TOKEN, { hash_expiration: 3600 });

        assertEquals(await client.init_data.isValid(initData), true);

        time.tick(1800 * 1000);
        assertEquals(await client.init_data.isValid(initData), false);

        time.tick(1860 * 1000);
        assertRejects(
          () => client.init_data.validate(initData),
          Error,
          "hash expired",
        );
      },
    );

    await t.step("should not expire when expires_in is 0", async () => {
      const auth_date = Math.floor(time.now / 1000);
      const initData = await signInitData(BOT_TOKEN, {
        user,
        query_id: "test123",
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: 0 });

      assertEquals(await client.init_data.isValid(initData), true);

      time.tick(365 * 24 * 60 * 60 * 1000);
      assertEquals(await client.init_data.isValid(initData), true);
    });

    await t.step("should not expire when expires_in is null", async () => {
      const auth_date = Math.floor(time.now / 1000);
      const initData = await signInitData(BOT_TOKEN, {
        user,
        query_id: "test123",
        auth_date,
      });

      const client = tgtb(BOT_TOKEN, { hash_expiration: null });

      assertEquals(await client.init_data.isValid(initData), true);

      time.tick(365 * 24 * 60 * 60 * 1000);
      assertEquals(await client.init_data.isValid(initData), true);
    });

    await t.step("should not expire when expires_in is undefined", async () => {
      const auth_date = Math.floor(time.now / 1000);
      const initData = await signInitData(BOT_TOKEN, {
        user,
        query_id: "test123",
        auth_date,
      });

      const client = tgtb(BOT_TOKEN);

      assertEquals(await client.init_data.isValid(initData), true);

      time.tick(365 * 24 * 60 * 60 * 1000);
      assertEquals(await client.init_data.isValid(initData), true);
    });
  });
});
