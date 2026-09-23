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
 * Functions of this module require `@faker-js/faker` to be installed, it is an
 * optional dependency. Every other part of the library works without it.
 *
 * @module
 */

import type { Faker } from "@faker-js/faker";
import { TOKEN_CHARS } from "../constants.ts";
import type { TelegramOAuthUser } from "../types/telegram.ts";
import {
  compareCodes,
  createDataCheckString,
  encode,
  importHMAC,
  signHMAC,
  toBase64,
  toHex,
} from "./crypto.ts";

const faker_module = await import("@faker-js/faker").catch(() => null);

const faker: Faker = faker_module?.faker ??
  new Proxy({} as Faker, {
    get() {
      throw new Error(
        "@faker-js/faker is required by tgtb test utilities, install it with `npm i -D @faker-js/faker`",
      );
    },
  });
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
    () => faker.helpers.arrayElement(TOKEN_CHARS.split("")),
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
  return faker.number.int({ min: 10000000, max: 9999999999 });
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
  const baseLength = faker.number.int({ min: 2, max: 28 });
  let baseName = faker.lorem.word()
    .replace(/[^a-zA-Z0-9]/g, "") // Remove any non-alphanumeric chars
    .slice(0, baseLength);

  // Ensure we have at least 2 characters after cleanup
  while (baseName.length < 2) {
    baseName = faker.lorem.word()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, baseLength);
  }

  // Randomly choose between CamelCase and snake_case
  const useCamelCase = faker.datatype.boolean();

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
 * Ed25519 key pair
 */
export async function generateEd25519KeyPair(): Promise<{
  public_key: string;
  private_key: CryptoKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  );

  return {
    public_key: toHex(await crypto.subtle.exportKey("raw", keyPair.publicKey)),
    private_key: keyPair.privateKey,
  };
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
 * @param options - signature key
 * @returns The signed init data
 */
export async function signInitData(
  bot_token: string,
  { user, query_id, auth_date }: {
    user: object | string;
    query_id: string;
    auth_date: number;
  },
  { signature_key }: { signature_key?: CryptoKey } = {},
): Promise<string> {
  type Entry = [string, string];
  const entries: Entry[] = [
    ["auth_date", auth_date.toString()],
    ["query_id", query_id],
    ["user", typeof user === "string" ? user : JSON.stringify(user)],
  ];

  if (signature_key) {
    const signature = await crypto.subtle.sign(
      { name: "Ed25519" },
      signature_key,
      encode(
        `${bot_token.split(":")[0]}:WebAppData\n` +
          createDataCheckString(entries, ["hash", "signature"]),
      ),
    );

    entries.push(["signature", toBase64(signature)]);
  }

  const sortedEntries = entries.sort(([a], [b]) => compareCodes(a, b));

  const secretKey = await signHMAC(
    await importHMAC(encode("WebAppData")),
    encode(bot_token),
  );

  const hash = await signHMAC(
    await importHMAC(await secretKey),
    encode(createDataCheckString(sortedEntries)),
  );

  const params = sortedEntries
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `${params}&hash=${toHex(hash)}`;
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
 * @param options - signature key
 */
export async function randomInitData(
  bot_token: string = randomBotToken(),
  { signature_key }: { signature_key?: CryptoKey } = {},
): Promise<string> {
  const queryId = `AAF${faker.string.alphanumeric(20)}`;
  const user = {
    id: faker.number.int({ min: 10000000, max: 999999999 }),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    username: faker.internet.username().toLowerCase(),
    language_code: faker.helpers.arrayElement(["en", "ru", "es", "de"]),
    is_premium: faker.datatype.boolean(),
  };
  const authDate = Math.floor(Date.now() / 1000);

  return await signInitData(
    bot_token,
    {
      user,
      query_id: queryId,
      auth_date: authDate,
    },
    { signature_key },
  );
}

/**
 * Signs the OAuth user data
 *
 * @example
 * ```ts
 * import { signOAuthUser } from "@izzqz/tgtb/utils";
 *
 * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
 * const user = {
 *   id: 1234567890,
 *   first_name: "John",
 *   last_name: "Doe",
 *   username: "johndoe",
 *   auth_date: 1234567890,
 * };
 *
 * const signedData = await signOAuthUser(bot_token, user);
 * // { id: "1234567890", first_name: "John", ... hash: "..." }
 * ```
 *
 * @param bot_token - The bot token to use for signing
 * @param user - The user data to sign
 * @returns The signed user data with hash
 */
export async function signOAuthUser(
  bot_token: string,
  user: Omit<TelegramOAuthUser, "hash">,
): Promise<TelegramOAuthUser> {
  // Convert all values to strings and filter out undefined/null
  const entries = Object.entries(user)
    .filter(([key, value]) => value != null && key !== "hash")
    .map(([key, value]) => [key, String(value)]);

  const sortedEntries = entries.sort(([a], [b]) => compareCodes(a, b));

  const dataCheckString = sortedEntries
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(bot_token),
  );

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(dataCheckString),
  );

  // Convert back to original types for id and auth_date
  const processedEntries = entries.map(([key, value]) => {
    if (key === "id") {
      return [key, parseInt(value, 10)];
    }
    if (key === "auth_date") {
      return [key, parseInt(value, 10)];
    }
    return [key, value];
  });

  return {
    ...Object.fromEntries(processedEntries),
    hash: toHex(signature),
  };
}

/**
 * Generates random OAuth user data
 *
 * @example
 * ```ts
 * import { randomOAuthUser } from "@izzqz/tgtb/utils";
 *
 * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
 * const user = await randomOAuthUser(bot_token);
 * // { id: "1234567890", first_name: "John", ... hash: "..." }
 *
 * // this user data is valid and could be verified
 * import tgtb from "@izzqz/tgtb";
 *
 * tgtb(bot_token).oauth.validate(user); // true
 * ```
 *
 * @param bot_token - The bot token to use for signing. If not provided, a random one will be generated.
 * @returns Random signed user data
 */
export async function randomOAuthUser(
  bot_token: string = randomBotToken(),
): Promise<TelegramOAuthUser> {
  const user: Omit<TelegramOAuthUser, "hash"> = {
    id: faker.number.int({ min: 10000000, max: 999999999 }),
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    username: faker.internet.username(),
    photo_url: faker.image.url(),
    auth_date: Math.floor(Date.now() / 1000),
  };

  return await signOAuthUser(bot_token, user);
}
