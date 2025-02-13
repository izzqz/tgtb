import { assertEquals, assertMatch } from "jsr:@std/assert";
import { randomBotToken, randomBotId, randomBotUsername } from "../src/test-utils/index.ts";

Deno.test("randomBotToken", async (t) => {
  await t.step("should generate valid bot token", () => {
    const botToken = randomBotToken();
    assertMatch(botToken, /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/);
  });

  await t.step("should use provided bot_id (10_000 iterations)", () => {
    for (let i = 0; i < 10_000; i++) {
      const botId = 12345678;
      const botToken = randomBotToken(botId);
      assertEquals(
        botToken.split(":")[0],
        botId.toString(),
        `Iteration ${i + 1}: Token should start with provided bot_id (${botToken})`
      );
      assertMatch(
        botToken,
        /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/,
        `Iteration ${i + 1}: Token format should be valid (${botToken})`
      );
    }
  });
});

Deno.test("randomBotId", async (t) => {
  await t.step("should generate valid bot id", () => {
    const botId = randomBotId();
    assertMatch(
      botId.toString(),
      /^[0-9]{8,10}$/,
      `Bot ID should be 8-10 digits (${botId})`
    );
  });

  await t.step("should generate id within valid range", () => {
    const botId = randomBotId();
    assertEquals(
      botId >= 10000000 && botId <= 9999999999,
      true,
      `Bot ID should be between 10000000 and 9999999999 (${botId})`
    );
  });
});

Deno.test("randomBotUsername", async (t) => {
  await t.step("should generate valid username (10_000 iterations)", () => {
    for (let i = 0; i < 10_000; i++) {
      const username = randomBotUsername();
      
      // Test length (5-32 characters)
      assertEquals(
        username.length >= 5 && username.length <= 32,
        true,
        `Iteration ${i + 1}: Username length should be between 5 and 32, got ${username.length} (${username})`
      );
      
      // Test valid characters
      assertMatch(
        username,
        /^[A-Za-z0-9_]+$/,
        `Iteration ${i + 1}: Username should only contain alphanumeric and underscore (${username})`
      );
      
      // Test bot suffix
      const endsWithBot = username.toLowerCase().endsWith("bot");
      assertEquals(
        endsWithBot,
        true,
        `Iteration ${i + 1}: Username should end with 'bot' (${username})`
      );
      
      // Test format (either CamelCase or snake_case)
      const validFormat = /^[A-Za-z0-9]+Bot$/.test(username) || /^[a-z0-9]+_bot$/.test(username);
      assertEquals(
        validFormat,
        true,
        `Iteration ${i + 1}: Username should be in either CamelCase or snake_case format (${username})`
      );
    }
  });
});
