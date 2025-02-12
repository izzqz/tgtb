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

// Pre-compute hex table as array for V8 optimization
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
  const secretKeyPromise = crypto.subtle.sign("HMAC", WEBAPP_KEY, encoder.encode(bot_token));
  let secretKey: CryptoKey;

  return async function validateWebapp(init_data: string): Promise<TelegramWebApps.WebAppInitData> {
    if (!init_data) throw new TypeError("InitData is nullish");

    // Initialize secret key if not done yet (V8 optimized branch)
    if (secretKey === undefined) {
      secretKey = await crypto.subtle.importKey(
        "raw",
        await secretKeyPromise,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
    }

    const decodedData = decodeURIComponent(init_data);
    const dataLen = decodedData.length | 0; // V8 hint for integer math
    
    // Fast hash extraction with manual char checks
    let hashStart = -1;
    let i = 0;
    while (i < dataLen - 4) {
      if (decodedData.charCodeAt(i) === 104 && // 'h'
          decodedData.charCodeAt(i + 1) === 97 && // 'a'
          decodedData.charCodeAt(i + 2) === 115 && // 's'
          decodedData.charCodeAt(i + 3) === 104 && // 'h'
          decodedData.charCodeAt(i + 4) === 61) { // '='
        hashStart = i;
        break;
      }
      i++;
    }
    if (hashStart === -1) throw new Error("No hash found in init data");
    
    const hashValueStart = hashStart + 5;
    let hashEnd = decodedData.indexOf(AMP, hashValueStart);
    if (hashEnd === -1) hashEnd = dataLen;
    const userHash = decodedData.slice(hashValueStart, hashEnd);

    // Fast parts collection with manual char checks
    let partCount = 0;
    let start = 0;
    
    // Manual string splitting (V8 optimized)
    while (start < dataLen) {
      const end = decodedData.indexOf(AMP, start);
      if (end === -1) {
        if (!decodedData.startsWith(HASH + EQUALS, start)) {
          PARTS_BUFFER[partCount++] = decodedData.slice(start);
        }
        break;
      }
      
      if (!decodedData.startsWith(HASH + EQUALS, start)) {
        PARTS_BUFFER[partCount++] = decodedData.slice(start, end);
      }
      start = end + 1;
    }

    // Use insertion sort for small arrays (faster than quicksort for n < 32)
    if (partCount > 1) {
      insertionSort(PARTS_BUFFER, 0, partCount - 1);
    }

    // Fast string concatenation with known size
    let dataCheckString = PARTS_BUFFER[0];
    for (let i = 1; i < partCount; i++) {
      dataCheckString += NL + PARTS_BUFFER[i];
    }

    const dataBuffer = encoder.encode(dataCheckString);
    const dataHash = await crypto.subtle.sign("HMAC", secretKey, dataBuffer);
    
    // Ultra-fast hex conversion with manual char codes
    const view = new Uint8Array(dataHash);
    const viewLen = view.length | 0; // V8 hint for integer math
    for (let i = 0; i < viewLen; i++) {
      const hex = HEX_CHARS[view[i]];
      HEX_BUFFER[i << 1] = hex[0];
      HEX_BUFFER[(i << 1) + 1] = hex[1];
    }
    const hashHex = HEX_BUFFER.join("");

    if (hashHex !== userHash) {
      throw new Error("Hash mismatch");
    }

    // Fast metadata parsing with minimal allocations
    const metadata: Record<string, unknown> = Object.create(null); // V8 optimized object
    start = 0;
    
    while (start < dataLen) {
      const end = decodedData.indexOf(AMP, start);
      const eqPos = decodedData.indexOf(EQUALS, start);
      
      if (eqPos > start && (end === -1 || eqPos < end)) {
        const key = decodedData.slice(start, eqPos);
        const value = decodedData.slice(eqPos + 1, end === -1 ? dataLen : end);
        
        if (key === USER) {
          const parsedUser = JSON.parse(value);
          metadata[USER] = {
            ...parsedUser,
            id: Number(parsedUser.id) | 0, // V8 hint for integer
          };
        } else if (key === AUTH_DATE) {
          metadata[AUTH_DATE] = Number(value) * 1000; // Convert to milliseconds
        } else {
          metadata[key] = value;
        }
      }
      
      if (end === -1) break;
      start = end + 1;
    }

    metadata[HASH] = userHash;
    return metadata as unknown as TelegramWebApps.WebAppInitData;
  };
}
