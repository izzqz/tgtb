/**
 * Crypto utilities
 * @module
 */

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

/**
 * @internal
 */
export const importHMAC = async (
  buffer: BufferSource,
): Promise<CryptoKey> =>
  await crypto.subtle.importKey(
    "raw",
    buffer,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );

/**
 * @internal
 */
export const signHMAC = async (
  key: CryptoKey,
  data: BufferSource,
): Promise<ArrayBuffer> => {
  return await crypto.subtle.sign("HMAC", key, data);
};

/**
 * @internal
 */
export const createDataCheckString = (
  entries: Iterable<[string, unknown]>,
): string => {
  return [...entries]
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
};

/**
 * Text encoder
 *
 * @internal
 */
export const encode: TextEncoder["encode"] = TextEncoder.prototype.encode.bind(
  new TextEncoder(),
);
