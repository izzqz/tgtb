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
    false,
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
export const importEd25519 = async (
  buffer: BufferSource,
): Promise<CryptoKey> =>
  await crypto.subtle.importKey(
    "raw",
    buffer,
    { name: "Ed25519" },
    false,
    ["verify"],
  );

/**
 * @internal
 */
export const verifyEd25519 = async (
  key: CryptoKey,
  signature: BufferSource,
  data: BufferSource,
): Promise<boolean> => {
  return await crypto.subtle.verify({ name: "Ed25519" }, key, signature, data);
};

/**
 * @internal
 */
export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
};

/**
 * @internal
 */
export const compareCodes = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/**
 * @internal
 */
export const createDataCheckString = (
  entries: Iterable<[string, unknown]>,
  exclude: readonly string[] = ["hash"],
): string => {
  return [...entries]
    .filter(([key]) => !exclude.includes(key))
    .sort(([a], [b]) => compareCodes(a, b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
};

/**
 * @internal
 */
const asBytes = (buffer: BufferSource): Uint8Array =>
  buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer)
    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

/**
 * @internal
 */
export const toHex = (buffer: BufferSource): string =>
  Array.from(asBytes(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * @internal
 */
export const toBase64 = (buffer: BufferSource): string => {
  let binary = "";
  for (const byte of asBytes(buffer)) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
};

/**
 * @internal
 */
export const fromHex = (hex: string): Uint8Array<ArrayBuffer> => {
  if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    throw new Error("invalid hex string");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
};

/**
 * @internal
 */
export const fromBase64 = (base64: string): Uint8Array<ArrayBuffer> => {
  const normalized = base64.replaceAll("-", "+").replaceAll("_", "/");

  return Uint8Array.from(atob(normalized), (c) => c.charCodeAt(0));
};

/**
 * Text encoder
 *
 * @internal
 */
export const encode = (input: string): Uint8Array<ArrayBuffer> => {
  return new TextEncoder().encode(input) as Uint8Array<ArrayBuffer>;
};
