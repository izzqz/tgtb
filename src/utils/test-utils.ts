/**
 * Utility functions for testing
 *
 * @example Get random init data string
 * ```ts
 * import { randomInitData } from "@izzqz/tgtb/utils";
 *
 * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
 *
 * const initData = await randomInitData(bot_token);
 * initData: "user=%7B%22id%22%3A1234567890%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%7D&query_id=1234567890&auth_date=1234567890&hash=1234567890"
 *
 * // this init data is valid and could be verified
 * import tgtb from "@izzqz/tgtb";
 *
 * tgtb(bot_token).init_data.validate(initData); // true
 * ```
 *
 * @example Get random bot token
 * ```ts
 * import { randomBotToken } from "@izzqz/tgtb/utils";
 *
 * const botToken = randomBotToken();
 * botToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
 * ```
 *
 * @module
 */

import { faker } from "jsr:@jackfiszr/faker";
import { TOKEN_CHARS } from "../constants.ts";
/**
 * Generates a random bot token
 *
 * @example
 * ```ts
 * import { randomBotToken } from "@izzqz/tgtb/utils";
 * randomBotToken();
 * // "1542529915:AAG2lazAfktSdXzKacTXfzU2hmcg99POAZQ"
 *
 * // with specific bot id
 * randomBotToken(1234567);
 * // "1234567:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
 * ```
 *
 * @param bot_id - The bot ID to use in the token. If not provided, a random ID will be generated.
 * @returns A random bot token.
 */
export function randomBotToken(bot_id?: number): string {
  const botId = bot_id ?? randomBotId();
  const botHash = Array.from(
    { length: 35 },
    () => faker.random.arrayElement(TOKEN_CHARS.split("")),
  ).join("");

  return `${botId}:${botHash}`;
}

/**
 * Generates a random bot ID
 *
 * @example
 * ```ts
 * import { randomBotId } from "@izzqz/tgtb/utils";
 *
 * randomBotId(); // 43496954931
 * ```
 *
 * @returns A random bot ID
 */
export function randomBotId(): number {
  return faker.random.number({ min: 10000000, max: 9999999999 });
}

/**
 * Generates a random bot username
 *
 * It will allways ands with bot. Could be in camelCase or snake_case
 *
 * @example
 * ```ts
 * import { randomBotUsername } from "@izzqz/tgtb/utils";
 *
 * randomBotUsername(); // "tetris_bot"
 * ```
 *
 * @returns A random bot username
 */
export function randomBotUsername(): string {
  // Generate base name (2-29 chars to accommodate 'bot' suffix)
  const baseLength = faker.random.number({ min: 2, max: 28 });
  let baseName = faker.random.word()
    .replace(/[^a-zA-Z0-9]/g, "") // Remove any non-alphanumeric chars
    .slice(0, baseLength);

  // Ensure we have at least 2 characters after cleanup
  while (baseName.length < 2) {
    baseName = faker.random.word()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, baseLength);
  }

  // Randomly choose between CamelCase and snake_case
  const useCamelCase = faker.random.boolean();

  if (useCamelCase) {
    // CamelCase format (e.g., TetrisBot)
    const capitalizedBase = baseName.charAt(0).toUpperCase() +
      baseName.slice(1).toLowerCase();
    return `${capitalizedBase}Bot`;
  } else {
    // snake_case format (e.g., tetris_bot)
    return `${baseName.toLowerCase()}_bot`;
  }
}

/**
 * HMAC SHA-256 hash function
 *
 * @private
 * @param key - The key to use for the hash.
 * @param data - The data to hash.
 * @returns The hash of the data.
 */
async function hmacSha256(
  key: ArrayBuffer,
  data: ArrayBuffer,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, data);
}

/**
 * Converts an ArrayBuffer to a hex string
 *
 * @private
 * @param buffer - The ArrayBuffer to convert.
 * @returns The hex string.
 */
function buf2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Signs the init data
 *
 * You need to specify user object
 *
 * @example
 * ```ts
 *
 * import { signInitData } from "@izzqz/tgtb/utils";
 *
 * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
 * const initData = await signInitData(bot_token, {
 *   user: { id: 1234567890, first_name: "John", last_name: "Doe", username: "johndoe" },
 *   query_id: "1234567890",
 *   auth_date: 1234567890,
 * });
 *
 * initData; // "user=%7B%22id%22%3A1234567890%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%7D&query_id=1234567890&auth_date=1234567890&hash=1234567890"
 *
 * // this init data is valid and could be verified
 * import tgtb from "@izzqz/tgtb";
 *
 * tgtb(bot_token).init_data.validate(initData); // true
 * ```
 *
 * @param bot_token - The bot token to use for the signature
 * @param params - The parameters to sign
 * @returns The signed init data
 */
export async function signInitData(
  bot_token: string,
  { user, query_id, auth_date }: {
    user: object | string;
    query_id: string;
    auth_date: number;
  },
): Promise<string> {
  type Entry = [string, string];
  const entries: Entry[] = [
    ["auth_date", auth_date.toString()],
    ["query_id", query_id],
    ["user", typeof user === "string" ? user : JSON.stringify(user)],
  ];

  const sortedEntries = entries.sort(([a], [b]) => a.localeCompare(b));

  const { params, dataCheckString } = sortedEntries.reduce<{
    dataCheckString: string;
    params: string;
  }>(
    (acc, [key, value], index) => ({
      dataCheckString: acc.dataCheckString + (index ? "\n" : "") +
        `${key}=${value}`,
      params: acc.params + (index ? "&" : "") +
        `${key}=${encodeURIComponent(value)}`,
    }),
    { dataCheckString: "", params: "" },
  );

  const encoder = new TextEncoder();
  const secretKey = await hmacSha256(
    encoder.encode("WebAppData"),
    encoder.encode(bot_token),
  );

  const signature = await hmacSha256(
    secretKey,
    encoder.encode(dataCheckString),
  );

  return `${params}&hash=${buf2hex(signature)}`;
}

/**
 * Generates a random init data
 *
 * @example
 * ```ts
 * import { randomInitData } from "@izzqz/tgtb/utils";
 *
 * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
 *
 * const initData = await randomInitData(bot_token);
 * initData; // "user=%7B%22id%22%3A1234567890%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%7D&query_id=1234567890&auth_date=1234567890&hash=1234567890"
 *
 * // this init data is valid and could be verified
 * import tgtb from "@izzqz/tgtb";
 *
 * tgtb(bot_token).init_data.validate(initData); // true
 * ```
 * @param bot_token - The bot token to use for signing
 */
export async function randomInitData(
  bot_token: string = randomBotToken(),
): Promise<string> {
  const queryId = `AAF${faker.random.alphaNumeric(20)}`;
  const user = {
    id: faker.random.number({ min: 10000000, max: 999999999 }),
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    username: faker.internet.userName().toLowerCase(),
    language_code: faker.random.arrayElement(["en", "ru", "es", "de"]),
    is_premium: faker.random.boolean(),
  };
  const authDate = Math.floor(Date.now() / 1000);

  return await signInitData(bot_token, {
    user,
    query_id: queryId,
    auth_date: authDate,
  });
}
