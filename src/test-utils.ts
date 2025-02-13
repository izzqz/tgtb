import { faker } from "jsr:@jackfiszr/faker@1.1.6";

const BOT_TOKEN_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split("");

export function randomBotToken(bot_id?: number) {
  const botId = bot_id ?? randomBotId();
  const botHash = Array.from(
    { length: 35 },
    () => faker.random.arrayElement(BOT_TOKEN_CHARS),
  ).join("");

  return `${botId}:${botHash}`;
}

export function randomBotId() {
  return faker.random.number({ min: 10000000, max: 9999999999 });
}

export function randomBotUsername() {
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
