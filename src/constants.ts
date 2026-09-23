/**
 * @module
 * Constants. Useful for Telegram API
 */

/**
 * Symbols allowed in bot token or secret token
 */
export const TOKEN_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

/**
 * "WebApp" as Uint8Array
 */
export const WEB_APP_UINT8: Uint8Array<ArrayBuffer> = new Uint8Array([
  87,
  101,
  98,
  65,
  112,
  112,
  68,
  97,
  116,
  97,
]);

/**
 * Telegram Ed25519 public key
 */
export const TELEGRAM_ED25519_PUBLIC_KEY =
  "e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d";

/**
 * Telegram test Ed25519 public key
 */
export const TELEGRAM_TEST_ED25519_PUBLIC_KEY =
  "40055058a4ee38156a06562e52eece92a771bcd8346a8c4615cb7376eddf72ec";
