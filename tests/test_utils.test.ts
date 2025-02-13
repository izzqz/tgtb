import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { randomBotToken, randomBotId, randomBotUsername } from "@izzqz/tgtb/test";
import { faker } from "jsr:@jackfiszr/faker@1.1.6";
import {
    assertSpyCall,
    assertSpyCalls,
    returnsNext,
    stub,
} from "jsr:@std/testing/mock";

Deno.test("randomBotToken", async (t) => {
    await t.step("should generate valid bot token", () => {
        using numberStub = stub(faker.random, "number", returnsNext([12345678]));
        using elementStub = stub(faker.random, "arrayElement", returnsNext(Array(35).fill("a")));

        const botToken = randomBotToken();
        assertMatch(botToken, /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/);
        
        assertSpyCall(numberStub, 0, {
            args: [{ min: 10000000, max: 9999999999 }],
            returned: 12345678,
        });
        assertSpyCalls(elementStub, 35);
    });

    await t.step("should use provided bot_id", () => {
        using elementStub = stub(faker.random, "arrayElement", returnsNext(Array(35).fill("a")));
        
        const botId = 12345678;
        const botToken = randomBotToken(botId);
        
        assertEquals(
            botToken.split(":")[0],
            botId.toString(),
            `Token should start with provided bot_id (${botToken})`
        );
        assertMatch(
            botToken,
            /^[0-9]{8,10}:[a-zA-Z0-9_-]{35}$/,
            `Token format should be valid (${botToken})`
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
            `Bot ID should be 8-10 digits (${botId})`
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
                `Bot ID should match expected value (got ${botId}, expected ${expected})`
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
        using wordStub = stub(faker.random, "word", returnsNext(["Test@#$%^&*()User"]));
        using booleanStub = stub(faker.random, "boolean", returnsNext([true]));
        
        const username = randomBotUsername();
        
        assertMatch(
            username,
            /^[A-Za-z0-9]+Bot$/,
            `Username should be valid even with non-alphanumeric input (${username})`
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
        using wordStub = stub(faker.random, "word", returnsNext([Array(50).fill("a").join("")]));
        using booleanStub = stub(faker.random, "boolean", returnsNext([true]));
        
        const username = randomBotUsername();
        
        assertEquals(
            username.length <= 32,
            true,
            `Username should not exceed 32 characters (${username})`
        );
        assertEquals(
            username.toLowerCase().endsWith("bot"),
            true,
            `Username should end with 'bot' (${username})`
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
            `Username should be at least 5 characters long (${username})`
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
