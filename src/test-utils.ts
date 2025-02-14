import { faker } from "jsr:@jackfiszr/faker";

export function randomBotToken(bot_id?: number): string {
  const BOT_TOKEN_CHARS =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split(
      "",
    );

  const botId = bot_id ?? randomBotId();
  const botHash = Array.from(
    { length: 35 },
    () => faker.random.arrayElement(BOT_TOKEN_CHARS),
  ).join("");

  return `${botId}:${botHash}`;
}

export function randomBotId(): number {
  return faker.random.number({ min: 10000000, max: 9999999999 });
}

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
  return crypto.subtle.sign("HMAC", cryptoKey, data);
}

function buf2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signInitData(
  bot_token: string,
  params: { user: object | string; query_id: string; auth_date: number },
): Promise<string> {
  const { user, query_id, auth_date } = params;

  // Create data check string
  const paramsMap = new Map<string, string>([
    ["auth_date", auth_date.toString()],
    ["query_id", query_id],
    ["user", typeof user === "string" ? user : JSON.stringify(user)],
  ]);

  // Sort params alphabetically and create data check string
  const dataCheckString = Array.from(paramsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Create secret key
  const textEncoder = new TextEncoder();
  const webAppData = textEncoder.encode("WebAppData");
  const botTokenData = textEncoder.encode(bot_token);
  const secretKey = await hmacSha256(webAppData, botTokenData);

  // Sign data check string
  const dataCheckData = textEncoder.encode(dataCheckString);
  const signature = await hmacSha256(secretKey, dataCheckData);

  // Create final init data string
  const initDataParams = Array.from(paramsMap.entries())
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `${initDataParams}&hash=${buf2hex(signature)}`;
}

export async function randomInitData(bot_token: string): Promise<string> {
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
