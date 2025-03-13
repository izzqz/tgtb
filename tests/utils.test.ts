import {
  assert,
  assertEquals,
  assertMatch,
  assertNotEquals,
} from "jsr:@std/assert";

import { faker } from "jsr:@jackfiszr/faker";
import {
  assertSpyCall,
  assertSpyCalls,
  returnsNext,
  stub,
} from "jsr:@std/testing/mock";

import {
  createSecret,
  randomBotId,
  randomBotToken,
  randomBotUsername,
  randomInitData,
  randomOAuthUser,
  signInitData,
  signOAuthUser,
} from "@izzqz/tgtb/utils";
import tgtb from "@izzqz/tgtb";
import type { TelegramOAuthUser } from "../src/types/telegram.ts";

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
  await t.step(
    "should generate valid init data with stubbed values",
    async () => {
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

      const validator = tgtb(botToken).init_data;
      await validator.validate(initData);
    },
  );

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
    const validator = tgtb(botToken).init_data;
    await validator.validate(initData1);
    await validator.validate(initData2);
  });

  await t.step("should handle special characters in user data", async () => {
    using _alphaNumericStub = stub(
      faker.random,
      "alphaNumeric",
      returnsNext(["ABC123"]),
    );
    using _numberStub = stub(
      faker.random,
      "number",
      returnsNext([123456789]),
    );
    using _firstNameStub = stub(
      faker.name,
      "firstName",
      returnsNext(["John & Jane"]),
    );
    using _lastNameStub = stub(
      faker.name,
      "lastName",
      returnsNext(["O'Doe=Smith"]),
    );
    using _userNameStub = stub(
      faker.internet,
      "userName",
      returnsNext(["john.doe+test"]),
    );
    using _arrayElementStub = stub(
      faker.random,
      "arrayElement",
      returnsNext(["en"]),
    );
    using _booleanStub = stub(
      faker.random,
      "boolean",
      returnsNext([true]),
    );

    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData = await randomInitData(botToken);

    const validator = tgtb(botToken).init_data;
    await validator.validate(initData);

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);
    assertEquals(user.first_name, "John & Jane");
    assertEquals(user.last_name, "O'Doe=Smith");
    assertEquals(user.username, "john.doe+test");
  });

  await t.step("should work without bot_token parameter", async () => {
    using _alphaNumericStub = stub(
      faker.random,
      "alphaNumeric",
      returnsNext(["ABC123"]),
    );
    using _numberStub = stub(
      faker.random,
      "number",
      returnsNext([123456789, 123456789]), // One for bot_id, one for user.id
    );
    using _arrayElementStub = stub(
      faker.random,
      "arrayElement",
      returnsNext([...Array(35).fill("A"), "en"]),
    );
    using _firstNameStub = stub(
      faker.name,
      "firstName",
      returnsNext(["John"]),
    );
    using _lastNameStub = stub(
      faker.name,
      "lastName",
      returnsNext(["Doe"]),
    );
    using _userNameStub = stub(
      faker.internet,
      "userName",
      returnsNext(["johndoe"]),
    );
    using _booleanStub = stub(
      faker.random,
      "boolean",
      returnsNext([true]),
    );

    const initData = await randomInitData();
    const expectedBotToken = "123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    const validator = tgtb(expectedBotToken).init_data;
    await validator.validate(initData);
  });
});

Deno.test("signInitData", async (t) => {
  await t.step("should sign init data with provided values", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const params = {
      user: {
        id: 123456789,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        language_code: "en",
        is_premium: true,
      },
      query_id: "AAFABC123XYZ",
      auth_date: 1234567890,
    };

    const initData = await signInitData(botToken, params);

    // Verify the generated init data structure
    const urlParams = new URLSearchParams(initData);

    // Verify auth_date
    assertEquals(urlParams.get("auth_date"), "1234567890");

    // Verify query_id
    assertEquals(urlParams.get("query_id"), "AAFABC123XYZ");

    // Verify user object
    const user = JSON.parse(urlParams.get("user")!);
    assertEquals(user, params.user);

    // Verify hash is correct (64 hex chars)
    const hash = urlParams.get("hash")!;
    assertMatch(hash, /^[a-f0-9]{64}$/);

    // Verify the data is valid
    const validator = tgtb(botToken).init_data;
    await validator.validate(initData);
  });

  await t.step("should handle special characters in user data", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const params = {
      user: {
        id: 123456789,
        first_name: "John & Jane",
        last_name: "O'Doe=Smith",
        username: "john.doe+test",
        language_code: "en",
        is_premium: true,
      },
      query_id: "AAFABC123XYZ",
      auth_date: 1234567890,
    };

    const initData = await signInitData(botToken, params);

    // Verify the data is valid
    const validator = tgtb(botToken).init_data;
    await validator.validate(initData);

    // Verify user data is preserved
    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get("user")!);
    assertEquals(user.first_name, "John & Jane");
    assertEquals(user.last_name, "O'Doe=Smith");
    assertEquals(user.username, "john.doe+test");
  });

  await t.step("should generate same hash for same input", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const params = {
      user: {
        id: 123456789,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        language_code: "en",
        is_premium: true,
      },
      query_id: "AAFABC123XYZ",
      auth_date: 1234567890,
    };

    const initData1 = await signInitData(botToken, params);
    const initData2 = await signInitData(botToken, params);

    assertEquals(initData1, initData2, "Same input should produce same output");
  });

  await t.step(
    "should generate different hash for different bot tokens",
    async () => {
      const params = {
        user: {
          id: 123456789,
          first_name: "John",
          last_name: "Doe",
          username: "johndoe",
          language_code: "en",
          is_premium: true,
        },
        query_id: "AAFABC123XYZ",
        auth_date: 1234567890,
      };

      const botToken1 = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
      const botToken2 = "654321:XYZ-ABC4321lkIhg-w2v1u123ew11";

      const initData1 = await signInitData(botToken1, params);
      const initData2 = await signInitData(botToken2, params);

      assertNotEquals(
        initData1,
        initData2,
        "Different tokens should produce different output",
      );
    },
  );

  await t.step("should accept pre-stringified user data", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const userObj = {
      id: 123456789,
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
      language_code: "en",
      is_premium: true,
    };
    const params = {
      user: JSON.stringify(userObj),
      query_id: "AAFABC123XYZ",
      auth_date: 1234567890,
    };

    const initData = await signInitData(botToken, params);

    // Verify the data is valid
    const validator = tgtb(botToken).init_data;
    await validator.validate(initData);

    // Verify user data is preserved exactly as provided
    const urlParams = new URLSearchParams(initData);
    assertEquals(urlParams.get("user"), JSON.stringify(userObj));
  });

  await t.step("should handle pre-encoded user string", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const userString = encodeURIComponent(JSON.stringify({
      id: 123456789,
      first_name: "John & Jane",
      last_name: "O'Doe=Smith",
      username: "john.doe+test",
      language_code: "en",
      is_premium: true,
    }));
    const params = {
      user: userString,
      query_id: "AAFABC123XYZ",
      auth_date: 1234567890,
    };

    const initData = await signInitData(botToken, params);

    // Verify the data is valid
    const validator = tgtb(botToken).init_data;
    await validator.validate(initData);

    // Verify user data is preserved exactly as provided
    const urlParams = new URLSearchParams(initData);
    assertEquals(urlParams.get("user"), userString);
  });

  await t.step(
    "should produce same hash for equivalent object and string input",
    async () => {
      const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
      const userObj = {
        id: 123456789,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        language_code: "en",
        is_premium: true,
      };

      const paramsWithObj = {
        user: userObj,
        query_id: "AAFABC123XYZ",
        auth_date: 1234567890,
      };

      const paramsWithString = {
        user: JSON.stringify(userObj),
        query_id: "AAFABC123XYZ",
        auth_date: 1234567890,
      };

      const initData1 = await signInitData(botToken, paramsWithObj);
      const initData2 = await signInitData(botToken, paramsWithString);

      assertEquals(
        initData1,
        initData2,
        "Object and string input should produce same output",
      );
    },
  );
});

Deno.test("createSecret", async (t) => {
  await t.step("should generate valid secret with default length", () => {
    const secret = createSecret();
    assertMatch(
      secret,
      /^[A-Za-z0-9_-]{256}$/,
      `Secret should only contain allowed characters and be 256 chars long (${secret})`,
    );
  });

  await t.step("should generate valid secret with custom length", () => {
    const lengths = [1, 16, 32, 128, 256];
    for (const length of lengths) {
      const secret = createSecret(length);
      assertMatch(
        secret,
        /^[A-Za-z0-9_-]+$/,
        `Secret should only contain allowed characters (${secret})`,
      );
      assertEquals(
        secret.length,
        length,
        `Secret length should match specified length (got ${secret.length}, expected ${length})`,
      );
    }
  });

  await t.step("should generate unique secrets", () => {
    const secret1 = createSecret();
    const secret2 = createSecret();
    const secret3 = createSecret();

    assertNotEquals(
      secret1,
      secret2,
      "Consecutive secrets should be different",
    );
    assertNotEquals(
      secret2,
      secret3,
      "Consecutive secrets should be different",
    );
    assertNotEquals(
      secret1,
      secret3,
      "Consecutive secrets should be different",
    );
  });

  await t.step("should use cryptographically secure random values", () => {
    const mockValues = new Uint8Array([65, 66, 67]); // ABC
    using randomStub = stub(
      crypto,
      "getRandomValues",
      returnsNext([mockValues]),
    );

    const secret = createSecret(3);

    assertSpyCall(randomStub, 0, {
      args: [new Uint8Array(3)],
      returned: mockValues,
    });
    assertSpyCalls(randomStub, 1);
    assertMatch(secret, /^[A-Za-z0-9_-]{3}$/);
  });
});

Deno.test("signOAuthUser", async (t) => {
  await t.step("should sign user data with provided values", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const user: Omit<TelegramOAuthUser, "hash"> = {
      id: 123456789,
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
      photo_url: "https://example.com/photo.jpg",
      auth_date: 1234567890,
    };

    const signedData = await signOAuthUser(botToken, user);

    // Verify all original fields are preserved with correct types
    assertEquals(signedData.id, 123456789);
    assertEquals(signedData.first_name, "John");
    assertEquals(signedData.last_name, "Doe");
    assertEquals(signedData.username, "johndoe");
    assertEquals(signedData.photo_url, "https://example.com/photo.jpg");
    assertEquals(signedData.auth_date, 1234567890);

    // Verify hash is present and valid (64 hex chars)
    assertMatch(signedData.hash, /^[a-f0-9]{64}$/);

    // Verify the data is valid
    const validator = tgtb(botToken).oauth;
    await validator.validate(signedData);
  });

  await t.step("should handle special characters in user data", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const user: Omit<TelegramOAuthUser, "hash"> = {
      id: 123456789,
      first_name: "John & Jane",
      last_name: "O'Doe=Smith",
      username: "john.doe+test",
      photo_url: "https://example.com/photo.jpg",
      auth_date: 1234567890,
    };

    const signedData = await signOAuthUser(botToken, user);

    // Verify special characters are preserved
    assertEquals(signedData.first_name, "John & Jane");
    assertEquals(signedData.last_name, "O'Doe=Smith");
    assertEquals(signedData.username, "john.doe+test");

    // Verify the data is valid
    const validator = tgtb(botToken).oauth;
    await validator.validate(signedData);
  });

  await t.step("should generate same hash for same input", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const user: Omit<TelegramOAuthUser, "hash"> = {
      id: 123456789,
      first_name: "John",
      last_name: "Doe",
      username: "johndoe",
      photo_url: "https://example.com/photo.jpg",
      auth_date: 1234567890,
    };

    const signedData1 = await signOAuthUser(botToken, user);
    const signedData2 = await signOAuthUser(botToken, user);

    assertEquals(
      signedData1.hash,
      signedData2.hash,
      "Same input should produce same hash",
    );
  });

  await t.step(
    "should generate different hash for different bot tokens",
    async () => {
      const user: Omit<TelegramOAuthUser, "hash"> = {
        id: 123456789,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        photo_url: "https://example.com/photo.jpg",
        auth_date: 1234567890,
      };

      const botToken1 = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
      const botToken2 = "654321:XYZ-ABC4321lkIhg-w2v1u123ew11";

      const signedData1 = await signOAuthUser(botToken1, user);
      const signedData2 = await signOAuthUser(botToken2, user);

      assertNotEquals(
        signedData1.hash,
        signedData2.hash,
        "Different tokens should produce different hashes",
      );
    },
  );

  await t.step("should handle null and undefined values", async () => {
    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const user = {
      id: 123456789,
      first_name: "John",
      last_name: undefined,
      username: undefined,
      photo_url: "https://example.com/photo.jpg",
      auth_date: 1234567890,
    } as Omit<TelegramOAuthUser, "hash">;

    const signedData = await signOAuthUser(botToken, user);

    // Verify null and undefined fields are omitted
    assert(!("last_name" in signedData), "Undefined fields should be omitted");
    assert(!("username" in signedData), "Undefined fields should be omitted");

    // Verify the data is valid
    const validator = tgtb(botToken).oauth;
    await validator.validate(signedData);
  });
});

Deno.test("randomOAuthUser", async (t) => {
  await t.step(
    "should generate valid user data with stubbed values",
    async () => {
      const now = 1234567890;
      globalThis.Date.now = () => now * 1000;

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
      using imageUrlStub = stub(
        faker.image,
        "imageUrl",
        returnsNext(["https://example.com/photo.jpg"]),
      );

      const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
      const user = await randomOAuthUser(botToken);

      // Verify all faker calls
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
      assertSpyCall(imageUrlStub, 0, {
        args: [],
        returned: "https://example.com/photo.jpg",
      });

      // Verify generated user structure
      assertEquals(user.id, 123456789);
      assertEquals(user.first_name, "John");
      assertEquals(user.last_name, "Doe");
      assertEquals(user.username, "johndoe");
      assertEquals(user.photo_url, "https://example.com/photo.jpg");
      assertEquals(user.auth_date, 1234567890);

      // Verify hash is present and valid
      assertMatch(user.hash, /^[a-f0-9]{64}$/);

      // Verify the data is valid
      const validator = tgtb(botToken).oauth;
      await validator.validate(user);
    },
  );

  await t.step("should generate unique data each time", async () => {
    const now1 = 1234567890;
    const now2 = 1234567891;
    let currentTime = now1;
    globalThis.Date.now = () => currentTime * 1000;

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
    using imageUrlStub = stub(
      faker.image,
      "imageUrl",
      returnsNext([
        "https://example1.com/photo.jpg",
        "https://example2.com/photo.jpg",
      ]),
    );

    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const user1 = await randomOAuthUser(botToken);

    currentTime = now2;
    const user2 = await randomOAuthUser(botToken);

    assertNotEquals(user1.id, user2.id);
    assertNotEquals(user1.first_name, user2.first_name);
    assertNotEquals(user1.last_name, user2.last_name);
    assertNotEquals(user1.username, user2.username);
    assertNotEquals(user1.photo_url, user2.photo_url);
    assertNotEquals(user1.auth_date, user2.auth_date);
    assertNotEquals(user1.hash, user2.hash);

    // Verify all stubs were called twice
    assertSpyCalls(numberStub, 2);
    assertSpyCalls(firstNameStub, 2);
    assertSpyCalls(lastNameStub, 2);
    assertSpyCalls(userNameStub, 2);
    assertSpyCalls(imageUrlStub, 2);

    // Verify both users are valid
    const validator = tgtb(botToken).oauth;
    await validator.validate(user1);
    await validator.validate(user2);
  });

  await t.step("should work without bot_token parameter", async () => {
    using _numberStub = stub(
      faker.random,
      "number",
      returnsNext([123456789, 123456789]),
    );
    using _arrayElementStub = stub(
      faker.random,
      "arrayElement",
      returnsNext([...Array(35).fill("A"), "en"]),
    );
    using _firstNameStub = stub(
      faker.name,
      "firstName",
      returnsNext(["John"]),
    );
    using _lastNameStub = stub(
      faker.name,
      "lastName",
      returnsNext(["Doe"]),
    );
    using _userNameStub = stub(
      faker.internet,
      "userName",
      returnsNext(["johndoe"]),
    );

    const user = await randomOAuthUser();
    const expectedBotToken = "123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    const validator = tgtb(expectedBotToken).oauth;
    await validator.validate(user);
  });

  await t.step(
    "should handle special characters in generated data",
    async () => {
      using _numberStub = stub(
        faker.random,
        "number",
        returnsNext([123456789]),
      );
      using _firstNameStub = stub(
        faker.name,
        "firstName",
        returnsNext(["John & Jane"]),
      );
      using _lastNameStub = stub(
        faker.name,
        "lastName",
        returnsNext(["O'Doe=Smith"]),
      );
      using _userNameStub = stub(
        faker.internet,
        "userName",
        returnsNext(["john.doe+test"]),
      );
      using _imageUrlStub = stub(
        faker.image,
        "imageUrl",
        returnsNext(["https://example.com/photo+test.jpg"]),
      );

      const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
      const user = await randomOAuthUser(botToken);

      assertEquals(user.first_name, "John & Jane");
      assertEquals(user.last_name, "O'Doe=Smith");
      assertEquals(user.username, "john.doe+test");
      assertEquals(user.photo_url, "https://example.com/photo+test.jpg");

      const validator = tgtb(botToken).oauth;
      await validator.validate(user);
    },
  );
});
