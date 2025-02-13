import { create_validator } from "../lib/tg_validator.js";

const VALID_BOT_TOKEN = "7040088495:AAHVy6LQH-RvZzYi7c5-Yv5w046qPUO2NTk";
const VALID_INIT_DATA = "query_id=AAF9tpYRAAAAAH22lhEbSiPx&user=%7B%22id%22%3A295089789%2C%22first_name%22%3A%22Viacheslav%22%2C%22last_name%22%3A%22Melnikov%22%2C%22username%22%3A%22the_real_izzqz%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717087395&hash=7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7b";
const INVALID_INIT_DATA = "query_id=AAF9tpYRAAAAAH22lhEbSiPx&user=%7B%22id%22%3A295089789%2C%22first_name%22%3A%22Viacheslav%22%2C%22last_name%22%3A%22Melnikov%22%2C%22username%22%3A%22the_real_izzqz%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717087395&hash=7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7a";

import * as crypto from "node:crypto";
import tgtb from "../src/mod.ts";
export const verifyTelegramWebAppData = (telegramInitData: string): boolean => {
  // The data is a query string, which is composed of a series of field-value pairs.
  const encoded = decodeURIComponent(telegramInitData); 
  
  // HMAC-SHA-256 signature of the bot's token with the constant string WebAppData used as a key.
  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(VALID_BOT_TOKEN);

  // Data-check-string is a chain of all received fields'.
  const arr = encoded.split('&');
  const hashIndex = arr.findIndex(str => str.startsWith('hash='));
  const hash = arr.splice(hashIndex)[0].split('=')[1];
  // sorted alphabetically
  arr.sort((a, b) => a.localeCompare(b));
  // in the format key=<value> with a line feed character ('\n', 0x0A) used as separator
  // e.g., 'auth_date=<auth_date>\nquery_id=<query_id>\nuser=<user>
  const dataCheckString = arr.join('\n');
  
  // The hexadecimal representation of the HMAC-SHA-256 signature of the data-check-string with the secret key
  const _hash = crypto
    .createHmac('sha256', secret.digest())
    .update(dataCheckString)
    .digest('hex');
  
  // if hash are equal the data may be used on your server.
  // Complex data types are represented as JSON-serialized objects.
  return _hash === hash;
};

const bot = tgtb(VALID_BOT_TOKEN);

// Valid init data comparison
Deno.bench({
  name: "TypeScript",
  group: "valid init data",
  baseline: true,
  fn() {
    verifyTelegramWebAppData(VALID_INIT_DATA);
  },
});

Deno.bench({
  name: "WASM",
  group: "valid init data",
  fn() {
    bot.isInitDataValid(VALID_INIT_DATA);
  },
});

// Invalid init data comparison
Deno.bench({
  name: "TypeScript",
  group: "invalid init data",
  baseline: true,
  fn() {
    try {
      verifyTelegramWebAppData(INVALID_INIT_DATA);
    } catch {
      // Expected error
    }
  },
});

Deno.bench({
  name: "WASM",
  group: "invalid init data",
  fn() {
    try {
      bot.isInitDataValid(INVALID_INIT_DATA);
    } catch {
      // Expected error
    }
  },
});

// Empty init data comparison
Deno.bench({
  name: "TypeScript",
  group: "empty init data",
  baseline: true,
  fn() {
    try {
      verifyTelegramWebAppData("");
    } catch {
      // Expected error
    }
  },
});

Deno.bench({
  name: "WASM",
  group: "empty init data",
  fn() {
    try {
      bot.isInitDataValid("");
    } catch {
      // Expected error
    }
  },
});

// Malformed init data comparison
Deno.bench({
  name: "TypeScript",
  group: "malformed init data",
  baseline: true,
  fn() {
    try {
      verifyTelegramWebAppData("not_a_query_string");
    } catch {
      // Expected error
    }
  },
});

Deno.bench({
  name: "WASM",
  group: "malformed init data",
  fn() {
    try {
      bot.isInitDataValid("not_a_query_string");
    } catch {
      // Expected error
    }
  },
});
