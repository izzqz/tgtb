import type { TelegramWebApps } from "../types/telegram.ts";

// Pre-compute constants and buffers
const encoder = new TextEncoder();
const WEBAPP_AB = new Uint8Array([87, 101, 98, 65, 112, 112, 68, 97, 116, 97]);
const WEBAPP_KEY = await crypto.subtle.importKey(
  "raw",
  WEBAPP_AB,
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);

// V8 optimization hints
const HASH = "hash";
const USER = "user";
const AUTH_DATE = "auth_date";
const EQUALS = "=";
const AMP = "&";
const NL = "\n";

// Pre-compute hex table
const HEX_CHARS = new Array(256);
{
  const hex = "0123456789abcdef";
  for (let i = 0; i < 256; ++i) {
    HEX_CHARS[i] = hex[(i >> 4) & 15] + hex[i & 15];
  }
}

// Pre-allocate buffers
const PARTS_BUFFER = new Array(32);
const HEX_BUFFER = new Array(64);

// Fast sort for small arrays (V8 optimized)
function insertionSort(arr: string[], left: number, right: number): void {
  for (let i = left + 1; i <= right; i++) {
    const temp = arr[i];
    let j = i - 1;
    while (j >= left && arr[j] > temp) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = temp;
  }
}

export default function createValidateWebapp(bot_token: string) {
  "use strict";
  const secretKeyPromise = crypto.subtle.sign(
    "HMAC",
    WEBAPP_KEY,
    encoder.encode(bot_token),
  );
  let secretKey: CryptoKey;

  // V8 optimization: Monomorphic function with consistent property access
  const parseUser = (value: string) => {
    const user = JSON.parse(value);
    // Ensure consistent object shape for V8 hidden classes
    return {
      id: Number(user.id) | 0,
      first_name: user.first_name || "",
      last_name: user.last_name || undefined,
      username: user.username || undefined,
      language_code: user.language_code || undefined,
      is_premium: user.is_premium || undefined,
      allows_write_to_pm: user.allows_write_to_pm || undefined,
    };
  };

  return async function validateWebapp(
    init_data: string,
  ): Promise<TelegramWebApps.WebAppInitData> {
    if (!init_data) throw new TypeError("InitData is nullish");

    // V8 optimization: Cache length for loop optimization
    const dataLen = init_data.length | 0;

    // Initialize secret key if not done yet (V8 optimized branch prediction)
    if (!secretKey) {
      secretKey = await crypto.subtle.importKey(
        "raw",
        await secretKeyPromise,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
    }

    const decodedData = decodeURIComponent(init_data);

    // Fast hash extraction with manual char checks and integer math
    let hashStart = -1;
    let i = 0;
    const hashStr = "hash=";
    const hashLen = hashStr.length | 0;

    // V8 optimization: Use integer math and avoid array access
    while (i < (dataLen - hashLen)) {
      if (
        decodedData.charCodeAt(i) === 104 && // 'h'
        decodedData.charCodeAt(i + 1) === 97 && // 'a'
        decodedData.charCodeAt(i + 2) === 115 && // 's'
        decodedData.charCodeAt(i + 3) === 104 && // 'h'
        decodedData.charCodeAt(i + 4) === 61
      ) { // '='
        hashStart = i;
        break;
      }
      i = (i + 1) | 0;
    }

    if (hashStart === -1) throw new Error("No hash found in init data");

    const hashValueStart = (hashStart + 5) | 0;
    let hashEnd = decodedData.indexOf(AMP, hashValueStart);
    if (hashEnd === -1) hashEnd = dataLen;
    const userHash = decodedData.slice(hashValueStart, hashEnd);

    // V8 optimization: Use local variables for better register allocation
    let partCount = 0;
    let start = 0;
    let end = 0;

    // Manual string splitting with integer math
    while (start < dataLen) {
      end = decodedData.indexOf(AMP, start);
      if (end === -1) {
        if (!decodedData.startsWith(HASH + EQUALS, start)) {
          PARTS_BUFFER[partCount] = decodedData.slice(start);
          partCount = (partCount + 1) | 0;
        }
        break;
      }

      if (!decodedData.startsWith(HASH + EQUALS, start)) {
        PARTS_BUFFER[partCount] = decodedData.slice(start, end);
        partCount = (partCount + 1) | 0;
      }
      start = (end + 1) | 0;
    }

    // V8 optimization: Use insertion sort for small arrays
    if (partCount > 1) {
      insertionSort(PARTS_BUFFER, 0, partCount - 1);
    }

    // Fast string concatenation with known size
    let dataCheckString = PARTS_BUFFER[0];
    for (let i = 1; i < partCount; i = (i + 1) | 0) {
      dataCheckString += NL + PARTS_BUFFER[i];
    }

    const dataBuffer = encoder.encode(dataCheckString);
    const dataHash = await crypto.subtle.sign("HMAC", secretKey, dataBuffer);

    // Ultra-fast hex conversion with manual char codes and integer math
    const view = new Uint8Array(dataHash);
    const viewLen = view.length | 0;

    for (let i = 0; i < viewLen; i = (i + 1) | 0) {
      const idx = (i << 1) | 0;
      const hex = HEX_CHARS[view[i]];
      HEX_BUFFER[idx] = hex[0];
      HEX_BUFFER[idx + 1] = hex[1];
    }

    const hashHex = HEX_BUFFER.slice(0, viewLen << 1).join("");

    if (hashHex !== userHash) {
      throw new Error("Hash mismatch");
    }

    // V8 optimization: Create object with consistent shape
    const metadata = {
      hash: userHash,
      auth_date: 0,
      user: {} as TelegramWebApps.WebAppInitData["user"],
      query_id: "",
    };

    start = 0;
    while (start < dataLen) {
      const end = decodedData.indexOf(AMP, start);
      const eqPos = decodedData.indexOf(EQUALS, start);

      if (eqPos > start && (end === -1 || eqPos < end)) {
        const key = decodedData.slice(start, eqPos);
        const value = decodedData.slice(eqPos + 1, end === -1 ? dataLen : end);

        // V8 optimization: Use switch for better branch prediction
        switch (key) {
          case USER:
            metadata.user = parseUser(value);
            break;
          case AUTH_DATE:
            metadata.auth_date = Number(value) * 1000;
            break;
          case "query_id":
            metadata.query_id = value;
            break;
        }
      }

      if (end === -1) break;
      start = (end + 1) | 0;
    }

    return metadata as unknown as TelegramWebApps.WebAppInitData;
  };
}
