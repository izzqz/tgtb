import { describe, it } from "jsr:@std/testing/bdd";
import { assertEquals, assertRejects } from "jsr:@std/assert";

import createValidateWebapp from "../src/factories/validate_webapp.ts";
import type { TelegramWebApps } from "../src/types/telegram.ts";

describe("validateWebapp", () => {
  const validBotToken = "7040088495:AAHVy6LQH-RvZzYi7c5-Yv5w046qPUO2NTk";
  const validInitDataString =
    "query_id=AAF9tpYRAAAAAH22lhEbSiPx&user=%7B%22id%22%3A295089789%2C%22first_name%22%3A%22Viacheslav%22%2C%22last_name%22%3A%22Melnikov%22%2C%22username%22%3A%22the_real_izzqz%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717087395&hash=7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7b";
  const validMetadata: TelegramWebApps.WebAppInitData = {
    query_id: "AAF9tpYRAAAAAH22lhEbSiPx",
    user: {
      id: 295089789,
      first_name: "Viacheslav",
      last_name: "Melnikov",
      username: "the_real_izzqz",
      language_code: "en",
      is_premium: true,
      allows_write_to_pm: true,
    },
    auth_date: 1717087395000,
    hash: "7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7b",
  };

  const validateWebapp = createValidateWebapp(validBotToken);

  it("should correctly verify and parse user data when provided with valid hash and data", async () => {
    const result = await validateWebapp(validInitDataString);
    assertEquals(result, validMetadata);
  });

  it("should throw error when init_data is empty", async () => {
    await assertRejects(
      () => validateWebapp(""),
      TypeError,
      "InitData is nullish",
    );
  });

  it("should throw error when init_data is missing hash", async () => {
    const noHashData = "user=%7B%22id%22%3A12345%7D&auth_date=1609459200";
    await assertRejects(
      () => validateWebapp(noHashData),
      Error,
      "No hash found in init data",
    );
  });

  it("should throw error when hash is invalid", async () => {
    const invalidHashData =
      "hash=wrongHash&user=%7B%22id%22%3A12345%7D&auth_date=1609459200";
    await assertRejects(
      () => validateWebapp(invalidHashData),
      Error,
      "Hash mismatch",
    );
  });

  it("should throw error when bot token is incorrect", async () => {
    const wrongBotToken = "wrongToken";
    const validateWithWrongToken = createValidateWebapp(wrongBotToken);

    await assertRejects(
      () => validateWithWrongToken(validInitDataString),
      Error,
      "Hash mismatch",
    );
  });

  it("should throw error when init_data is malformed", async () => {
    const malformedData = "not_a_query_string";
    await assertRejects(
      () => validateWebapp(malformedData),
      Error,
      "No hash found in init data",
    );
  });

  it("should handle url encoded data correctly", async () => {
    const result = await validateWebapp(validInitDataString);
    assertEquals(typeof result.query_id, "string");
    assertEquals(typeof result.auth_date, "number");
    assertEquals(typeof result.hash, "string");
  });
});
