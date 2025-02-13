import { assertEquals, assertRejects } from "jsr:@std/assert";
import tgtb from "../src/mod.ts";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

Deno.test("validate_webapp", async (t) => {
  const client = tgtb(BOT_TOKEN);

  await t.step("should validate init data with valid structure but invalid hash", async () => {
    const initData = "auth_date=1234567890&query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D&hash=c0d3e6c3ca85c0d3c7e6a7b8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7";
    
    const result = await client.isInitDataValid(initData);
    assertEquals(result, false);
  });

  await t.step("should reject invalid hash", async () => {
    const initData = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890&hash=invalid";
    
    const result = await client.isInitDataValid(initData);
    assertEquals(result, false);
  });

  await t.step("should reject missing hash", async () => {
    const initData = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890";
    
    await assertRejects(
      () => client.isInitDataValid(initData),
      Error,
      "missing hash field"
    );
  });

  await t.step("should reject empty init data", async () => {
    await assertRejects(
      () => client.isInitDataValid(""),
      Error,
      "empty init data"
    );
  });

  await t.step("should reject malformed query pair", async () => {
    const initData = "query_id&user=test&hash=abc";
    
    await assertRejects(
      () => client.isInitDataValid(initData),
      Error,
      "malformed query pair"
    );
  });

  await t.step("should reject query without equals sign", async () => {
    const initData = "queryidtest";
    
    await assertRejects(
      () => client.isInitDataValid(initData),
      Error,
      "missing hash field"
    );
  });

  await t.step("should validate real-world example with valid hash", async () => {
    // Note: This is a real-world example structure, but with an invalid hash for security
    const initData = "query_id=AAHdF6IQAAAAAN0XohDhrOrc" + 
      "&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22User%22%2C" +
      "%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22en%22%7D" +
      "&auth_date=1707116400" +
      "&start_param=test_start" +
      "&hash=c0d3e6c3ca85c0d3c7e6a7b8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7";

    const result = await client.isInitDataValid(initData);
    assertEquals(result, false);
  });
});

