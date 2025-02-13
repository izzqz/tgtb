import { assertEquals, assertRejects } from "jsr:@std/assert";
import tgtb from "../src/mod.ts";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
const VALID_BOT_TOKEN = "7040088495:AAHVy6LQH-RvZzYi7c5-Yv5w046qPUO2NTk";
const VALID_INIT_DATA = "query_id=AAF9tpYRAAAAAH22lhEbSiPx&user=%7B%22id%22%3A295089789%2C%22first_name%22%3A%22Viacheslav%22%2C%22last_name%22%3A%22Melnikov%22%2C%22username%22%3A%22the_real_izzqz%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717087395&hash=7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7b";

Deno.test("validate_webapp", async (t) => {
  const client = tgtb(BOT_TOKEN);

  await t.step("should validate real-world valid init data", async () => {
    const validClient = tgtb(VALID_BOT_TOKEN);
    const result = await validClient.isInitDataValid(VALID_INIT_DATA);
    assertEquals(result, true);
  });

  await t.step("should reject init data with valid structure but invalid hash", async () => {
    const initData = "auth_date=1234567890&query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D&hash=c0d3e6c3ca85c0d3c7e6a7b8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7";
    
    await assertRejects(
      () => client.isInitDataValid(initData),
      Error,
      "hash mismatch"
    );
  });

  await t.step("should reject invalid hash", async () => {
    const initData = "query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A1234567890%7D&auth_date=1234567890&hash=invalid";
    
    await assertRejects(
      () => client.isInitDataValid(initData),
      Error,
      "hash mismatch"
    );
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

    await assertRejects(
      () => client.isInitDataValid(initData),
      Error,
      "hash mismatch"
    );
  });
});



