import assert from "node:assert/strict";
import { test } from "node:test";

import { faker } from "@faker-js/faker";

import {
  createSecret,
  randomBotId,
  randomBotToken,
  randomBotUsername,
  randomInitData,
  randomOAuthUser,
  signInitData,
  signOAuthUser,
} from "../src/utils/mod.ts";
import tgtb from "../src/mod.ts";
import type { TelegramOAuthUser } from "../src/types/telegram.ts";

function returnsNext<T>(values: T[]): (..._args: unknown[]) => T {
  const remaining = [...values];
  return () => remaining.shift()!;
}

test("randomBotToken", async (t) => {
  await t.test(" generate valid bot token", (t) => {
    const numberStub = t.mock.method(faker.number, "int", returnsNext([12345678]));
    const elementStub = t.mock.method(
      faker.helpers,
      "arrayElement",
      returnsNext(Array(35).fill("a")),
    );

    const botToken = randomBotToken();
    assert.match(botToken, /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/);

    assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 10000000, max: 9999999999 }]);
    assert.strictEqual(numberStub.mock.calls[0].result, 12345678);
    assert.strictEqual(elementStub.mock.callCount(), 35);
  });

  await t.test("use provided bot_id", (t) => {
    const elementStub = t.mock.method(
      faker.helpers,
      "arrayElement",
      returnsNext(Array(35).fill("a")),
    );

    const botId = 12345678;
    const botToken = randomBotToken(botId);

    assert.deepStrictEqual(
      botToken.split(":")[0],
      botId.toString(),
      `Token start with provided bot_id (${botToken})`,
    );
    assert.match(
      botToken,
      /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/,
      `Token format  be valid (${botToken})`,
    );

    assert.strictEqual(elementStub.mock.callCount(), 35);
  });
});

test("randomBotId", async (t) => {
  await t.test(" generate valid bot id", (t) => {
    const numberStub = t.mock.method(faker.number, "int", returnsNext([12345678]));

    const botId = randomBotId();
    assert.match(
      botId.toString(),
      /^[0-9]{8,10}$/,
      `Bot ID  be 8-10 digits (${botId})`,
    );

    assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 10000000, max: 9999999999 }]);
    assert.strictEqual(numberStub.mock.calls[0].result, 12345678);
  });

  await t.test("generate id within valid range", (t) => {
    const testValues = [10000000, 9999999999, 123456789];
    const numberStub = t.mock.method(faker.number, "int", returnsNext(testValues));

    for (const expected of testValues) {
      const botId = randomBotId();
      assert.deepStrictEqual(
        botId,
        expected,
        `Bot ID  match expected value (got ${botId}, expected ${expected})`,
      );
    }

    assert.strictEqual(numberStub.mock.callCount(), testValues.length);
  });
});

test("randomBotUsername", async (t) => {
  await t.test("generate valid username with CamelCase", (t) => {
    const numberStub = t.mock.method(faker.number, "int", returnsNext([10]));
    const wordStub = t.mock.method(faker.lorem, "word", returnsNext(["testname"]));
    const booleanStub = t.mock.method(faker.datatype, "boolean", returnsNext([true]));

    const username = randomBotUsername();

    assert.deepStrictEqual(username, "TestnameBot");
    assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 2, max: 28 }]);
    assert.strictEqual(numberStub.mock.calls[0].result, 10);
    assert.deepStrictEqual(wordStub.mock.calls[0].arguments, []);
    assert.strictEqual(wordStub.mock.calls[0].result, "testname");
    assert.deepStrictEqual(booleanStub.mock.calls[0].arguments, []);
    assert.strictEqual(booleanStub.mock.calls[0].result, true);
  });

  await t.test("generate valid username with snake_case", (t) => {
    const numberStub = t.mock.method(faker.number, "int", returnsNext([10]));
    const wordStub = t.mock.method(faker.lorem, "word", returnsNext(["testname"]));
    const booleanStub = t.mock.method(faker.datatype, "boolean", returnsNext([false]));

    const username = randomBotUsername();

    assert.deepStrictEqual(username, "testname_bot");
    assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 2, max: 28 }]);
    assert.strictEqual(numberStub.mock.calls[0].result, 10);
    assert.deepStrictEqual(wordStub.mock.calls[0].arguments, []);
    assert.strictEqual(wordStub.mock.calls[0].result, "testname");
    assert.deepStrictEqual(booleanStub.mock.calls[0].arguments, []);
    assert.strictEqual(booleanStub.mock.calls[0].result, false);
  });

  await t.test("handle non-alphanumeric input", (t) => {
    const numberStub = t.mock.method(faker.number, "int", returnsNext([10]));
    const wordStub = t.mock.method(
      faker.lorem,
      "word",
      returnsNext(["Test@#$%^&*()User"]),
    );
    const booleanStub = t.mock.method(faker.datatype, "boolean", returnsNext([true]));

    const username = randomBotUsername();

    assert.match(
      username,
      /^[A-Za-z0-9]+Bot$/,
      `Username  be valid even with non-alphanumeric input (${username})`,
    );
    assert.deepStrictEqual(username, "TestuserBot");
    assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 2, max: 28 }]);
    assert.strictEqual(numberStub.mock.calls[0].result, 10);
    assert.deepStrictEqual(wordStub.mock.calls[0].arguments, []);
    assert.strictEqual(wordStub.mock.calls[0].result, "Test@#$%^&*()User");
    assert.deepStrictEqual(booleanStub.mock.calls[0].arguments, []);
    assert.strictEqual(booleanStub.mock.calls[0].result, true);
  });

  await t.test("handle maximum length input", (t) => {
    const numberStub = t.mock.method(faker.number, "int", returnsNext([28]));
    const wordStub = t.mock.method(
      faker.lorem,
      "word",
      returnsNext([Array(50).fill("a").join("")]),
    );
    const booleanStub = t.mock.method(faker.datatype, "boolean", returnsNext([true]));

    const username = randomBotUsername();

    assert.deepStrictEqual(
      username.length <= 32,
      true,
      `Username  not exceed 32 characters (${username})`,
    );
    assert.deepStrictEqual(
      username.toLowerCase().endsWith("bot"),
      true,
      `Username  end with 'bot' (${username})`,
    );
    assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 2, max: 28 }]);
    assert.strictEqual(numberStub.mock.calls[0].result, 28);
    assert.deepStrictEqual(wordStub.mock.calls[0].arguments, []);
    assert.strictEqual(wordStub.mock.calls[0].result, "a".repeat(50));
    assert.deepStrictEqual(booleanStub.mock.calls[0].arguments, []);
    assert.strictEqual(booleanStub.mock.calls[0].result, true);
  });

  await t.test("handle very short input", (t) => {
    const numberStub = t.mock.method(faker.number, "int", returnsNext([5]));
    const wordStub = t.mock.method(faker.lorem, "word", returnsNext(["a", "valid"]));
    const booleanStub = t.mock.method(faker.datatype, "boolean", returnsNext([true]));

    const username = randomBotUsername();

    assert.deepStrictEqual(
      username.length >= 5,
      true,
      `Username  be at least 5 characters long (${username})`,
    );
    assert.strictEqual(wordStub.mock.callCount(), 2);
    assert.deepStrictEqual(username, "ValidBot");
    assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 2, max: 28 }]);
    assert.strictEqual(numberStub.mock.calls[0].result, 5);
    assert.deepStrictEqual(booleanStub.mock.calls[0].arguments, []);
    assert.strictEqual(booleanStub.mock.calls[0].result, true);
  });
});

test("randomInitData", async (t) => {
  await t.test(
    "generate valid init data with stubbed values",
    async (t) => {
      const now = 1234567890;
      globalThis.Date.now = () => now * 1000;

      const alphaNumericStub = t.mock.method(
        faker.string,
        "alphanumeric",
        returnsNext(["ABC123XYZ"]),
      );
      const numberStub = t.mock.method(
        faker.number,
        "int",
        returnsNext([123456789]),
      );
      const firstNameStub = t.mock.method(
        faker.person,
        "firstName",
        returnsNext(["John"]),
      );
      const lastNameStub = t.mock.method(
        faker.person,
        "lastName",
        returnsNext(["Doe"]),
      );
      const userNameStub = t.mock.method(
        faker.internet,
        "username",
        returnsNext(["johndoe"]),
      );
      const arrayElementStub = t.mock.method(
        faker.helpers,
        "arrayElement",
        returnsNext(["en"]),
      );
      const booleanStub = t.mock.method(
        faker.datatype,
        "boolean",
        returnsNext([true]),
      );

      const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
      const initData = await randomInitData(botToken);

      // Verify all faker calls
      assert.deepStrictEqual(alphaNumericStub.mock.calls[0].arguments, [20]);
      assert.strictEqual(alphaNumericStub.mock.calls[0].result, "ABC123XYZ");
      assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 10000000, max: 999999999 }]);
      assert.strictEqual(numberStub.mock.calls[0].result, 123456789);
      assert.deepStrictEqual(firstNameStub.mock.calls[0].arguments, []);
      assert.strictEqual(firstNameStub.mock.calls[0].result, "John");
      assert.deepStrictEqual(lastNameStub.mock.calls[0].arguments, []);
      assert.strictEqual(lastNameStub.mock.calls[0].result, "Doe");
      assert.deepStrictEqual(userNameStub.mock.calls[0].arguments, []);
      assert.strictEqual(userNameStub.mock.calls[0].result, "johndoe");
      assert.deepStrictEqual(arrayElementStub.mock.calls[0].arguments, [["en", "ru", "es", "de"]]);
      assert.strictEqual(arrayElementStub.mock.calls[0].result, "en");
      assert.deepStrictEqual(booleanStub.mock.calls[0].arguments, []);
      assert.strictEqual(booleanStub.mock.calls[0].result, true);

      // Verify the generated init data structure
      const params = new URLSearchParams(initData);

      // Verify auth_date
      assert.deepStrictEqual(params.get("auth_date"), "1234567890");

      // Verify query_id
      assert.deepStrictEqual(params.get("query_id"), "AAFABC123XYZ");

      // Verify user object
      const user = JSON.parse(params.get("user")!);
      assert.deepStrictEqual(user, {
        id: 123456789,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        language_code: "en",
        is_premium: true,
      });

      // Verify hash is correct (64 hex chars)
      const hash = params.get("hash")!;
      assert.match(hash, /^[a-f0-9]{64}$/);

      const validator = tgtb(botToken).init_data;
      await validator.validate(initData);
    },
  );

  await t.test("generate unique data each time", async (t) => {
    const alphaNumericStub = t.mock.method(
      faker.string,
      "alphanumeric",
      returnsNext(["ABC123", "XYZ789"]),
    );
    const numberStub = t.mock.method(
      faker.number,
      "int",
      returnsNext([111111, 222222]),
    );
    const firstNameStub = t.mock.method(
      faker.person,
      "firstName",
      returnsNext(["Alice", "Bob"]),
    );
    const lastNameStub = t.mock.method(
      faker.person,
      "lastName",
      returnsNext(["Smith", "Jones"]),
    );
    const userNameStub = t.mock.method(
      faker.internet,
      "username",
      returnsNext(["alice", "bob"]),
    );
    const arrayElementStub = t.mock.method(
      faker.helpers,
      "arrayElement",
      returnsNext(["en", "ru"]),
    );
    const booleanStub = t.mock.method(
      faker.datatype,
      "boolean",
      returnsNext([true, false]),
    );

    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData1 = await randomInitData(botToken);
    const initData2 = await randomInitData(botToken);

    assert.notDeepStrictEqual(initData1, initData2);

    // Verify all stubs were called twice
    assert.strictEqual(alphaNumericStub.mock.callCount(), 2);
    assert.strictEqual(numberStub.mock.callCount(), 2);
    assert.strictEqual(firstNameStub.mock.callCount(), 2);
    assert.strictEqual(lastNameStub.mock.callCount(), 2);
    assert.strictEqual(userNameStub.mock.callCount(), 2);
    assert.strictEqual(arrayElementStub.mock.callCount(), 2);
    assert.strictEqual(booleanStub.mock.callCount(), 2);
    const validator = tgtb(botToken).init_data;
    await validator.validate(initData1);
    await validator.validate(initData2);
  });

  await t.test("handle special characters in user data", async (t) => {
    t.mock.method(faker.string, "alphanumeric", returnsNext(["ABC123"]));
    t.mock.method(faker.number, "int", returnsNext([123456789]));
    t.mock.method(faker.person, "firstName", returnsNext(["John & Jane"]));
    t.mock.method(faker.person, "lastName", returnsNext(["O'Doe=Smith"]));
    t.mock.method(faker.internet, "username", returnsNext(["john.doe+test"]));
    t.mock.method(faker.helpers, "arrayElement", returnsNext(["en"]));
    t.mock.method(faker.datatype, "boolean", returnsNext([true]));

    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const initData = await randomInitData(botToken);

    const validator = tgtb(botToken).init_data;
    await validator.validate(initData);

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);
    assert.deepStrictEqual(user.first_name, "John & Jane");
    assert.deepStrictEqual(user.last_name, "O'Doe=Smith");
    assert.deepStrictEqual(user.username, "john.doe+test");
  });

  await t.test("work without bot_token parameter", async (t) => {
    t.mock.method(faker.string, "alphanumeric", returnsNext(["ABC123"]));
    t.mock.method(faker.number, "int", returnsNext([123456789, 123456789]));
    t.mock.method(faker.helpers, "arrayElement", returnsNext([...Array(35).fill("A"), "en"]));
    t.mock.method(faker.person, "firstName", returnsNext(["John"]));
    t.mock.method(faker.person, "lastName", returnsNext(["Doe"]));
    t.mock.method(faker.internet, "username", returnsNext(["johndoe"]));
    t.mock.method(faker.datatype, "boolean", returnsNext([true]));

    const initData = await randomInitData();
    const expectedBotToken = "123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    const validator = tgtb(expectedBotToken).init_data;
    await validator.validate(initData);
  });
});

test("signInitData", async (t) => {
  await t.test(" sign init data with provided values", async () => {
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
    assert.deepStrictEqual(urlParams.get("auth_date"), "1234567890");

    // Verify query_id
    assert.deepStrictEqual(urlParams.get("query_id"), "AAFABC123XYZ");

    // Verify user object
    const user = JSON.parse(urlParams.get("user")!);
    assert.deepStrictEqual(user, params.user);

    // Verify hash is correct (64 hex chars)
    const hash = urlParams.get("hash")!;
    assert.match(hash, /^[a-f0-9]{64}$/);

    // Verify the data is valid
    const validator = tgtb(botToken).init_data;
    await validator.validate(initData);
  });

  await t.test("handle special characters in user data", async () => {
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
    assert.deepStrictEqual(user.first_name, "John & Jane");
    assert.deepStrictEqual(user.last_name, "O'Doe=Smith");
    assert.deepStrictEqual(user.username, "john.doe+test");
  });

  await t.test("generate same hash for same input", async () => {
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

    assert.deepStrictEqual(initData1, initData2, "Same input  produce same output");
  });

  await t.test(
    "generate different hash for different bot tokens",
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

      assert.notDeepStrictEqual(
        initData1,
        initData2,
        "Different tokens  produce different output",
      );
    },
  );

  await t.test("accept pre-stringified user data", async () => {
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
    assert.deepStrictEqual(urlParams.get("user"), JSON.stringify(userObj));
  });

  await t.test("handle pre-encoded user string", async () => {
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
    assert.deepStrictEqual(urlParams.get("user"), userString);
  });

  await t.test(
    "produce same hash for equivalent object and string input",
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

      assert.deepStrictEqual(
        initData1,
        initData2,
        "Object and string input  produce same output",
      );
    },
  );
});

test("createSecret", async (t) => {
  await t.test(" generate valid secret with default length", () => {
    const secret = createSecret();
    assert.match(
      secret,
      /^[A-Za-z0-9_-]{256}$/,
      `Secret  only contain allowed characters and be 256 chars long (${secret})`,
    );
  });

  await t.test(" generate valid secret with custom length", () => {
    const lengths = [1, 16, 32, 128, 256];
    for (const length of lengths) {
      const secret = createSecret(length);
      assert.match(
        secret,
        /^[A-Za-z0-9_-]+$/,
        `Secret  only contain allowed characters (${secret})`,
      );
      assert.deepStrictEqual(
        secret.length,
        length,
        `Secret length  match specified length (got ${secret.length}, expected ${length})`,
      );
    }
  });

  await t.test("generate unique secrets", () => {
    const secret1 = createSecret();
    const secret2 = createSecret();
    const secret3 = createSecret();

    assert.notDeepStrictEqual(
      secret1,
      secret2,
      "Consecutive secrets  be different",
    );
    assert.notDeepStrictEqual(
      secret2,
      secret3,
      "Consecutive secrets  be different",
    );
    assert.notDeepStrictEqual(
      secret1,
      secret3,
      "Consecutive secrets  be different",
    );
  });

  await t.test("use cryptographically secure random values", (t) => {
    const mockValues = new Uint8Array([65, 66, 67]); // ABC
    const randomStub = t.mock.method(
      crypto,
      "getRandomValues",
      returnsNext([mockValues]),
    );

    const secret = createSecret(3);

    assert.deepStrictEqual(randomStub.mock.calls[0].arguments, [new Uint8Array(3)]);
    assert.strictEqual(randomStub.mock.calls[0].result, mockValues);
    assert.strictEqual(randomStub.mock.callCount(), 1);
    assert.match(secret, /^[A-Za-z0-9_-]{3}$/);
  });
});

test("signOAuthUser", async (t) => {
  await t.test(" sign user data with provided values", async () => {
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
    assert.deepStrictEqual(signedData.id, 123456789);
    assert.deepStrictEqual(signedData.first_name, "John");
    assert.deepStrictEqual(signedData.last_name, "Doe");
    assert.deepStrictEqual(signedData.username, "johndoe");
    assert.deepStrictEqual(signedData.photo_url, "https://example.com/photo.jpg");
    assert.deepStrictEqual(signedData.auth_date, 1234567890);

    // Verify hash is present and valid (64 hex chars)
    assert.match(signedData.hash, /^[a-f0-9]{64}$/);

    // Verify the data is valid
    const validator = tgtb(botToken).oauth;
    await validator.validate(signedData);
  });

  await t.test("handle special characters in user data", async () => {
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
    assert.deepStrictEqual(signedData.first_name, "John & Jane");
    assert.deepStrictEqual(signedData.last_name, "O'Doe=Smith");
    assert.deepStrictEqual(signedData.username, "john.doe+test");

    // Verify the data is valid
    const validator = tgtb(botToken).oauth;
    await validator.validate(signedData);
  });

  await t.test("generate same hash for same input", async () => {
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

    assert.deepStrictEqual(
      signedData1.hash,
      signedData2.hash,
      "Same input  produce same hash",
    );
  });

  await t.test(
    "generate different hash for different bot tokens",
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

      assert.notDeepStrictEqual(
        signedData1.hash,
        signedData2.hash,
        "Different tokens  produce different hashes",
      );
    },
  );

  await t.test("handle null and undefined values", async () => {
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
    assert.ok(!("last_name" in signedData), "Undefined fields  be omitted");
    assert.ok(!("username" in signedData), "Undefined fields  be omitted");

    // Verify the data is valid
    const validator = tgtb(botToken).oauth;
    await validator.validate(signedData);
  });
});

test("randomOAuthUser", async (t) => {
  await t.test(
    "generate valid user data with stubbed values",
    async (t) => {
      const now = 1234567890;
      globalThis.Date.now = () => now * 1000;

      const numberStub = t.mock.method(
        faker.number,
        "int",
        returnsNext([123456789]),
      );
      const firstNameStub = t.mock.method(
        faker.person,
        "firstName",
        returnsNext(["John"]),
      );
      const lastNameStub = t.mock.method(
        faker.person,
        "lastName",
        returnsNext(["Doe"]),
      );
      const userNameStub = t.mock.method(
        faker.internet,
        "username",
        returnsNext(["johndoe"]),
      );
      const imageUrlStub = t.mock.method(
        faker.image,
        "url",
        returnsNext(["https://example.com/photo.jpg"]),
      );

      const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
      const user = await randomOAuthUser(botToken);

      // Verify all faker calls
      assert.deepStrictEqual(numberStub.mock.calls[0].arguments, [{ min: 10000000, max: 999999999 }]);
      assert.strictEqual(numberStub.mock.calls[0].result, 123456789);
      assert.deepStrictEqual(firstNameStub.mock.calls[0].arguments, []);
      assert.strictEqual(firstNameStub.mock.calls[0].result, "John");
      assert.deepStrictEqual(lastNameStub.mock.calls[0].arguments, []);
      assert.strictEqual(lastNameStub.mock.calls[0].result, "Doe");
      assert.deepStrictEqual(userNameStub.mock.calls[0].arguments, []);
      assert.strictEqual(userNameStub.mock.calls[0].result, "johndoe");
      assert.deepStrictEqual(imageUrlStub.mock.calls[0].arguments, []);
      assert.strictEqual(imageUrlStub.mock.calls[0].result, "https://example.com/photo.jpg");

      // Verify generated user structure
      assert.deepStrictEqual(user.id, 123456789);
      assert.deepStrictEqual(user.first_name, "John");
      assert.deepStrictEqual(user.last_name, "Doe");
      assert.deepStrictEqual(user.username, "johndoe");
      assert.deepStrictEqual(user.photo_url, "https://example.com/photo.jpg");
      assert.deepStrictEqual(user.auth_date, 1234567890);

      // Verify hash is present and valid
      assert.match(user.hash, /^[a-f0-9]{64}$/);

      // Verify the data is valid
      const validator = tgtb(botToken).oauth;
      await validator.validate(user);
    },
  );

  await t.test("generate unique data each time", async (t) => {
    const now1 = 1234567890;
    const now2 = 1234567891;
    let currentTime = now1;
    globalThis.Date.now = () => currentTime * 1000;

    const numberStub = t.mock.method(
      faker.number,
      "int",
      returnsNext([111111, 222222]),
    );
    const firstNameStub = t.mock.method(
      faker.person,
      "firstName",
      returnsNext(["Alice", "Bob"]),
    );
    const lastNameStub = t.mock.method(
      faker.person,
      "lastName",
      returnsNext(["Smith", "Jones"]),
    );
    const userNameStub = t.mock.method(
      faker.internet,
      "username",
      returnsNext(["alice", "bob"]),
    );
    const imageUrlStub = t.mock.method(
      faker.image,
      "url",
      returnsNext([
        "https://example1.com/photo.jpg",
        "https://example2.com/photo.jpg",
      ]),
    );

    const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
    const user1 = await randomOAuthUser(botToken);

    currentTime = now2;
    const user2 = await randomOAuthUser(botToken);

    assert.notDeepStrictEqual(user1.id, user2.id);
    assert.notDeepStrictEqual(user1.first_name, user2.first_name);
    assert.notDeepStrictEqual(user1.last_name, user2.last_name);
    assert.notDeepStrictEqual(user1.username, user2.username);
    assert.notDeepStrictEqual(user1.photo_url, user2.photo_url);
    assert.notDeepStrictEqual(user1.auth_date, user2.auth_date);
    assert.notDeepStrictEqual(user1.hash, user2.hash);

    // Verify all stubs were called twice
    assert.strictEqual(numberStub.mock.callCount(), 2);
    assert.strictEqual(firstNameStub.mock.callCount(), 2);
    assert.strictEqual(lastNameStub.mock.callCount(), 2);
    assert.strictEqual(userNameStub.mock.callCount(), 2);
    assert.strictEqual(imageUrlStub.mock.callCount(), 2);

    // Verify both users are valid
    const validator = tgtb(botToken).oauth;
    await validator.validate(user1);
    await validator.validate(user2);
  });

  await t.test("work without bot_token parameter", async (t) => {
    t.mock.method(faker.number, "int", returnsNext([123456789, 123456789]));
    t.mock.method(faker.helpers, "arrayElement", returnsNext([...Array(35).fill("A")]));
    t.mock.method(faker.person, "firstName", returnsNext(["John"]));
    t.mock.method(faker.person, "lastName", returnsNext(["Doe"]));
    t.mock.method(faker.internet, "username", returnsNext(["johndoe"]));
    t.mock.method(faker.image, "url", returnsNext(["https://example.com/photo.jpg"]));

    const user = await randomOAuthUser();
    const expectedBotToken = "123456789:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    const validator = tgtb(expectedBotToken).oauth;
    await validator.validate(user);
  });

  await t.test(
    "handle special characters in generated data",
    async (t) => {
      t.mock.method(faker.number, "int", returnsNext([123456789]));
      t.mock.method(faker.person, "firstName", returnsNext(["John & Jane"]));
      t.mock.method(faker.person, "lastName", returnsNext(["O'Doe=Smith"]));
      t.mock.method(faker.internet, "username", returnsNext(["john.doe+test"]));
      t.mock.method(
        faker.image,
        "url",
        returnsNext(["https://example.com/photo+test.jpg"]),
      );

      const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
      const user = await randomOAuthUser(botToken);

      assert.deepStrictEqual(user.first_name, "John & Jane");
      assert.deepStrictEqual(user.last_name, "O'Doe=Smith");
      assert.deepStrictEqual(user.username, "john.doe+test");
      assert.deepStrictEqual(user.photo_url, "https://example.com/photo+test.jpg");

      const validator = tgtb(botToken).oauth;
      await validator.validate(user);
    },
  );
});
