import { assert, assertEquals, assertMatch, assertNotEquals } from "jsr:@std/assert";

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
  await t.step("should generate valid init data with stubbed values", async () => {
    const now = 1234567890;
    globalThis.Date.now = () => now * 1000;

    using alphaNumericStub = stub(
      faker.random,
      "alphaNumeric",
      returnsNext(["ABC123XYZ"]),
    );
    using numberStub = stub(
      faker.random,
      "number",
      returnsNext([123456789]),
    );
    using firstNameStub = stub(
      faker.name,
      "firstName",
      returnsNext(["John"]),
    );
    using lastNameStub = stub(
      faker.name,
      "lastName",
      returnsNext(["Doe"]),
    );
    using userNameStub = stub(
      faker.internet,
      "userName",
      returnsNext(["johndoe"]),
    );
    using arrayElementStub = stub(
      faker.random,
      "arrayElement",
      returnsNext(["en"]),
    );
    using booleanStub = stub(
      faker.random,
      "boolean",
      returnsNext([true]),
    );

    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData = await randomInitData(botToken);

    // Verify all faker calls
    assertSpyCall(alphaNumericStub, 0, {
      args: [20],
      returned: "ABC123XYZ",
    });
    assertSpyCall(numberStub, 0, {
      args: [{ min: 10000000, max: 999999999 }],
      returned: 123456789,
    });
    assertSpyCall(firstNameStub, 0, {
      args: [],
      returned: "John",
    });
    assertSpyCall(lastNameStub, 0, {
      args: [],
      returned: "Doe",
    });
    assertSpyCall(userNameStub, 0, {
      args: [],
      returned: "johndoe",
    });
    assertSpyCall(arrayElementStub, 0, {
      args: [["en", "ru", "es", "de"]],
      returned: "en",
    });
    assertSpyCall(booleanStub, 0, {
      args: [],
      returned: true,
    });

    // Verify the generated init data structure
    const params = new URLSearchParams(initData);
    
    // Verify auth_date
    assertEquals(params.get("auth_date"), "1234567890");
    
    // Verify query_id
    assertEquals(params.get("query_id"), "AAFABC123XYZ");
    
    // Verify user object
    const user = JSON.parse(params.get("user")!);
    assertEquals(user, {
      id: 123456789,
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
      language_code: "en",
      is_premium: true,
    });

    // Verify hash is correct (64 hex chars)
    const hash = params.get("hash")!;
    assertMatch(hash, /^[a-f0-9]{64}$/);

    assert(tgtb(botToken).isInitDataValid(initData), "Init data should be valid");
  });

  await t.step("should generate unique data each time", async () => {
    using alphaNumericStub = stub(
      faker.random,
      "alphaNumeric",
      returnsNext(["ABC123", "XYZ789"]),
    );
    using numberStub = stub(
      faker.random,
      "number",
      returnsNext([111111, 222222]),
    );
    using firstNameStub = stub(
      faker.name,
      "firstName",
      returnsNext(["Alice", "Bob"]),
    );
    using lastNameStub = stub(
      faker.name,
      "lastName",
      returnsNext(["Smith", "Jones"]),
    );
    using userNameStub = stub(
      faker.internet,
      "userName",
      returnsNext(["alice", "bob"]),
    );
    using arrayElementStub = stub(
      faker.random,
      "arrayElement",
      returnsNext(["en", "ru"]),
    );
    using booleanStub = stub(
      faker.random,
      "boolean",
      returnsNext([true, false]),
    );

    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData1 = await randomInitData(botToken);
    const initData2 = await randomInitData(botToken);

    assertNotEquals(initData1, initData2);

    // Verify all stubs were called twice
    assertSpyCalls(alphaNumericStub, 2);
    assertSpyCalls(numberStub, 2);
    assertSpyCalls(firstNameStub, 2);
    assertSpyCalls(lastNameStub, 2);
    assertSpyCalls(userNameStub, 2);
    assertSpyCalls(arrayElementStub, 2);
    assertSpyCalls(booleanStub, 2);
    assert(tgtb(botToken).isInitDataValid(initData1), "Init data should be valid");
    assert(tgtb(botToken).isInitDataValid(initData2), "Init data should be valid");
  });

  await t.step("should handle special characters in user data", async () => {
    using alphaNumericStub = stub(
      faker.random,
      "alphaNumeric",
      returnsNext(["ABC123"]),
    );
    using numberStub = stub(
      faker.random,
      "number",
      returnsNext([123456789]),
    );
    using firstNameStub = stub(
      faker.name,
      "firstName",
      returnsNext(["John & Jane"]),
    );
    using lastNameStub = stub(
      faker.name,
      "lastName",
      returnsNext(["O'Doe=Smith"]),
    );
    using userNameStub = stub(
      faker.internet,
      "userName",
      returnsNext(["john.doe+test"]),
    );
    using arrayElementStub = stub(
      faker.random,
      "arrayElement",
      returnsNext(["en"]),
    );
    using booleanStub = stub(
      faker.random,
      "boolean",
      returnsNext([true]),
    );

    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData = await randomInitData(botToken);

    assert(tgtb(botToken).isInitDataValid(initData), "Init data should be valid");

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);
    assertEquals(user.first_name, "John & Jane");
    assertEquals(user.last_name, "O'Doe=Smith");
    assertEquals(user.username, "john.doe+test");
  });
});
