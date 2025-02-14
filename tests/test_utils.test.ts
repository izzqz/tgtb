import { assertEquals, assertMatch, assertNotEquals } from "jsr:@std/assert";

import { faker } from "jsr:@jackfiszr/faker";
import {
  assertSpyCall,
  assertSpyCalls,
  returnsNext,
  stub,
} from "jsr:@std/testing/mock";

import {
  randomBotId,
  randomBotToken,
  randomBotUsername,
  randomInitData,
} from "@izzqz/tgtb/test";
import tgtb from "@izzqz/tgtb";

Deno.test("randomBotToken", async (t) => {
  await t.step("should generate valid bot token", () => {
    using numberStub = stub(faker.random, "number", returnsNext([12345678]));
    using elementStub = stub(
      faker.random,
      "arrayElement",
      returnsNext(Array(35).fill("a")),
    );

    const botToken = randomBotToken();
    assertMatch(botToken, /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/);

    assertSpyCall(numberStub, 0, {
      args: [{ min: 10000000, max: 9999999999 }],
      returned: 12345678,
    });
    assertSpyCalls(elementStub, 35);
  });

  await t.step("should use provided bot_id", () => {
    using elementStub = stub(
      faker.random,
      "arrayElement",
      returnsNext(Array(35).fill("a")),
    );

    const botId = 12345678;
    const botToken = randomBotToken(botId);

    assertEquals(
      botToken.split(":")[0],
      botId.toString(),
      `Token should start with provided bot_id (${botToken})`,
    );
    assertMatch(
      botToken,
      /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/,
      `Token format should be valid (${botToken})`,
    );

    assertSpyCalls(elementStub, 35);
  });
});

Deno.test("randomBotId", async (t) => {
  await t.step("should generate valid bot id", () => {
    using numberStub = stub(faker.random, "number", returnsNext([12345678]));

    const botId = randomBotId();
    assertMatch(
      botId.toString(),
      /^[0-9]{8,10}$/,
      `Bot ID should be 8-10 digits (${botId})`,
    );

    assertSpyCall(numberStub, 0, {
      args: [{ min: 10000000, max: 9999999999 }],
      returned: 12345678,
    });
  });

  await t.step("should generate id within valid range", () => {
    const testValues = [10000000, 9999999999, 123456789];
    using numberStub = stub(faker.random, "number", returnsNext(testValues));

    for (const expected of testValues) {
      const botId = randomBotId();
      assertEquals(
        botId,
        expected,
        `Bot ID should match expected value (got ${botId}, expected ${expected})`,
      );
    }

    assertSpyCalls(numberStub, testValues.length);
  });
});

Deno.test("randomBotUsername", async (t) => {
  await t.step("should generate valid username with CamelCase", () => {
    using numberStub = stub(faker.random, "number", returnsNext([10]));
    using wordStub = stub(faker.random, "word", returnsNext(["testname"]));
    using booleanStub = stub(faker.random, "boolean", returnsNext([true]));

    const username = randomBotUsername();

    assertEquals(username, "TestnameBot");
    assertSpyCall(numberStub, 0, {
      args: [{ min: 2, max: 28 }],
      returned: 10,
    });
    assertSpyCall(wordStub, 0, {
      args: [],
      returned: "testname",
    });
    assertSpyCall(booleanStub, 0, {
      args: [],
      returned: true,
    });
  });

  await t.step("should generate valid username with snake_case", () => {
    using numberStub = stub(faker.random, "number", returnsNext([10]));
    using wordStub = stub(faker.random, "word", returnsNext(["testname"]));
    using booleanStub = stub(faker.random, "boolean", returnsNext([false]));

    const username = randomBotUsername();

    assertEquals(username, "testname_bot");
    assertSpyCall(numberStub, 0, {
      args: [{ min: 2, max: 28 }],
      returned: 10,
    });
    assertSpyCall(wordStub, 0, {
      args: [],
      returned: "testname",
    });
    assertSpyCall(booleanStub, 0, {
      args: [],
      returned: false,
    });
  });

  await t.step("should handle non-alphanumeric input", () => {
    using numberStub = stub(faker.random, "number", returnsNext([10]));
    using wordStub = stub(
      faker.random,
      "word",
      returnsNext(["Test@#$%^&*()User"]),
    );
    using booleanStub = stub(faker.random, "boolean", returnsNext([true]));

    const username = randomBotUsername();

    assertMatch(
      username,
      /^[A-Za-z0-9]+Bot$/,
      `Username should be valid even with non-alphanumeric input (${username})`,
    );
    assertEquals(username, "TestuserBot");
    assertSpyCall(numberStub, 0, {
      args: [{ min: 2, max: 28 }],
      returned: 10,
    });
    assertSpyCall(wordStub, 0, {
      args: [],
      returned: "Test@#$%^&*()User",
    });
    assertSpyCall(booleanStub, 0, {
      args: [],
      returned: true,
    });
  });

  await t.step("should handle maximum length input", () => {
    using numberStub = stub(faker.random, "number", returnsNext([28]));
    using wordStub = stub(
      faker.random,
      "word",
      returnsNext([Array(50).fill("a").join("")]),
    );
    using booleanStub = stub(faker.random, "boolean", returnsNext([true]));

    const username = randomBotUsername();

    assertEquals(
      username.length <= 32,
      true,
      `Username should not exceed 32 characters (${username})`,
    );
    assertEquals(
      username.toLowerCase().endsWith("bot"),
      true,
      `Username should end with 'bot' (${username})`,
    );
    assertSpyCall(numberStub, 0, {
      args: [{ min: 2, max: 28 }],
      returned: 28,
    });
    assertSpyCall(wordStub, 0, {
      args: [],
      returned: "a".repeat(50),
    });
    assertSpyCall(booleanStub, 0, {
      args: [],
      returned: true,
    });
  });

  await t.step("should handle very short input", () => {
    using numberStub = stub(faker.random, "number", returnsNext([5]));
    using wordStub = stub(faker.random, "word", returnsNext(["a", "valid"]));
    using booleanStub = stub(faker.random, "boolean", returnsNext([true]));

    const username = randomBotUsername();

    assertEquals(
      username.length >= 5,
      true,
      `Username should be at least 5 characters long (${username})`,
    );
    assertSpyCalls(wordStub, 2);
    assertEquals(username, "ValidBot");
    assertSpyCall(numberStub, 0, {
      args: [{ min: 2, max: 28 }],
      returned: 5,
    });
    assertSpyCall(booleanStub, 0, {
      args: [],
      returned: true,
    });
  });
});

Deno.test("randomInitData", async (t) => {
  await t.step("should generate valid init data", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData = await randomInitData(botToken);

    // Check format
    assertMatch(initData, /^auth_date=\d+&query_id=AAF[a-zA-Z0-9]+&user=/);
    assertMatch(initData, /&hash=[a-f0-9]{64}$/);

    // Check if it can be parsed
    const params = new URLSearchParams(initData);
    assertEquals(params.has("auth_date"), true);
    assertEquals(params.has("query_id"), true);
    assertEquals(params.has("user"), true);
    assertEquals(params.has("hash"), true);

    // Parse user data
    const user = JSON.parse(params.get("user")!);
    assertEquals(typeof user.id, "number");
    assertEquals(typeof user.first_name, "string");
    assertEquals(typeof user.last_name, "string");
    assertEquals(typeof user.username, "string");
    assertEquals(typeof user.language_code, "string");
    assertEquals(typeof user.is_premium, "boolean");
  });

  await t.step("should generate unique data each time", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData1 = await randomInitData(botToken);
    const initData2 = await randomInitData(botToken);

    assertNotEquals(initData1, initData2);
  });

  await t.step("should generate verifiable data", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData = await randomInitData(botToken);

    // This should not throw if the data is valid
    tgtb(botToken).isInitDataValid(initData);
  });
});
