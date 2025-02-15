import { assertEquals, assertThrows } from "jsr:@std/assert";
import tgtb from "@izzqz/tgtb";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
const VALID_BOT_TOKEN = "7040088495:AAHVy6LQH-RvZzYi7c5-Yv5w046qPUO2NTk";
const VALID_INIT_DATA =
  "query_id=AAF9tpYRAAAAAH22lhEbSiPx&user=%7B%22id%22%3A295089789%2C%22first_name%22%3A%22Viacheslav%22%2C%22last_name%22%3A%22Melnikov%22%2C%22username%22%3A%22the_real_izzqz%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717087395&hash=7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7b";

Deno.test("validate_webapp", async (t) => {
  const client = tgtb(BOT_TOKEN);

  await t.step("should validate real-world valid init data", () => {
    const validClient = tgtb(VALID_BOT_TOKEN);
    const result = validClient.init_data.isValid(VALID_INIT_DATA);
    assertEquals(result, true);
  });

  await t.step("should reject empty bot token", () => {
    assertThrows(
      () => tgtb(""),
      Error,
      "Invalid bot token",
    );
  });

  await t.step("should reject empty init data", () => {
    assertThrows(
      () => client.init_data.validate(""),
      Error,
      "init_data is empty",
    );
  });

  await t.step("should reject missing hash field", () => {
    const initData =
      "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890";

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "hash field not found",
    );
  });

  await t.step("should reject empty hash", () => {
    const initData = "query_id=test&hash=";

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "hash is empty",
    );
  });

  await t.step("should reject non-hex hash characters", () => {
    const initData = "query_id=test&hash=xyz123";

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "hash contains non-hex characters",
    );
  });

  await t.step("should reject incorrect hash length", () => {
    const initData = "query_id=test&hash=abc123";

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "hash length is 6, expected 64",
    );
  });

  await t.step("should reject malformed query pair", () => {
    const initData = "query_id&user=test&hash=" + "a".repeat(64);

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "malformed query pair",
    );
  });

  await t.step("should reject invalid URL encoding", () => {
    const initData = "query_id=test&user=%invalid%&hash=" + "0".repeat(64);

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });

  await t.step("should reject hash verification failure", () => {
    const initData = "query_id=test&user=test&hash=" + "0".repeat(64);

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });

  await t.step("should handle large input data", () => {
    const largeUser = {
      id: 123456789,
      first_name: "A".repeat(1000),
      last_name: "B".repeat(1000),
      username: "C".repeat(100),
    };
    const initData = `query_id=test&user=${
      encodeURIComponent(JSON.stringify(largeUser))
    }&hash=${"0".repeat(64)}`;

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });

  await t.step("should validate real-world example with valid hash", () => {
    // Note: This is a real-world example structure, but with an invalid hash for security
    const initData = "query_id=AAHdF6IQAAAAAN0XohDhrOrc" +
      "&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C" +
      "%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%7D" +
      "&auth_date=1707116400" +
      "&start_param=test_start" +
      "&hash=" + "0".repeat(64);

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });

  await t.step("should reject hash as first parameter", () => {
    const initData = `hash=${"0".repeat(64)}&auth_date=123`;

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "hash field not found",
    );
  });

  await t.step("should reject parameters after hash", () => {
    const initData = `auth_date=123&hash=${"0".repeat(64)}&foo=bar`;

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Invalid hash format: hash contains non-hex characters",
    );
  });

  await t.step("should handle case-insensitive key sorting", () => {
    const initData = `B=2&a=1&hash=${"0".repeat(64)}`;

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });

  await t.step("should handle encoded special characters", () => {
    const initData = `key%3D=value%26&hash=${"0".repeat(64)}`;

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });

  await t.step("should handle empty key or value", () => {
    const initData = `=value&key=&hash=${"0".repeat(64)}`;

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });

  await t.step("should handle multiple equals in pair", () => {
    const initData = `key=val=ue&hash=${"0".repeat(64)}`;

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });

  await t.step("should reject multiple hash parameters", () => {
    const initData = `hash=invalid&hash=${"0".repeat(64)}`;

    assertThrows(
      () => client.init_data.validate(initData),
      Error,
      "Hash verification failed",
    );
  });
});
