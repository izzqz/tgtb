import { TOKEN_CHARS } from "../constants.ts";

/**
 * Create a random secret string for X-Telegram-Bot-Api-Secret-Token header
 *
 * @example
 * ```ts
 * import { createSecret } from "@izzqz/tgtb/utils";
 *
 * createSecret(); // "1234567890abcdef1234567890abcdef"
 * createSecret(16); // "1234567890abcdef"
 * ```
 *
 * @param length - The length of the secret string
 * @returns A random secret string
 */
export function createSecret(length: number = 256): string {
  const array = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(array)
    .map((x) => TOKEN_CHARS[x % TOKEN_CHARS.length])
    .join("");
}
