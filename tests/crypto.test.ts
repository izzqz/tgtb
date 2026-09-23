import assert from "node:assert/strict";
import { test } from "node:test";

import {
  compareCodes,
  createDataCheckString,
  encode,
  fromBase64,
  fromHex,
  timingSafeEqual,
  toBase64,
  toHex,
} from "../src/utils/mod.ts";

test("compareCodes", async (t) => {
  await t.test("order by code units", () => {
    assert.deepStrictEqual(compareCodes("a", "b"), -1);
    assert.deepStrictEqual(compareCodes("b", "a"), 1);
    assert.deepStrictEqual(compareCodes("a", "a"), 0);
  });

  await t.test("ignore locale collation", () => {
    assert.deepStrictEqual(compareCodes("Z", "a"), -1);
    assert.deepStrictEqual(compareCodes("a", "Z"), 1);
  });

  await t.test("order empty strings", () => {
    assert.deepStrictEqual(compareCodes("", "a"), -1);
    assert.deepStrictEqual(compareCodes("a", ""), 1);
    assert.deepStrictEqual(compareCodes("", ""), 0);
  });
});

test("timingSafeEqual", async (t) => {
  await t.test("compare equal strings", () => {
    assert.deepStrictEqual(timingSafeEqual("abc", "abc"), true);
    assert.deepStrictEqual(timingSafeEqual("", ""), true);
  });

  await t.test("compare same-length strings", () => {
    assert.deepStrictEqual(timingSafeEqual("abc", "abd"), false);
    assert.deepStrictEqual(timingSafeEqual("abc", "abcd"), false);
  });
});

test("createDataCheckString", async (t) => {
  await t.test("exclude hash by default", () => {
    const entries: [string, unknown][] = [
      ["user", "1"],
      ["auth_date", "2"],
      ["hash", "deadbeef"],
    ];

    assert.deepStrictEqual(
      createDataCheckString(entries),
      "auth_date=2\nuser=1",
    );
  });

  await t.test("exclude custom keys", () => {
    const entries: [string, unknown][] = [
      ["user", "1"],
      ["hash", "deadbeef"],
      ["signature", "sig"],
    ];

    assert.deepStrictEqual(
      createDataCheckString(entries, ["hash", "signature"]),
      "user=1",
    );
  });

  await t.test("accept any iterable", () => {
    assert.deepStrictEqual(
      createDataCheckString(new Map([["b", "2"], ["a", "1"]])),
      "a=1\nb=2",
    );
  });

  await t.test("skip excluded keys only", () => {
    const entries: [string, unknown][] = [
      ["hash_match", "1"],
      ["hash", "2"],
    ];

    assert.deepStrictEqual(
      createDataCheckString(entries),
      "hash_match=1",
    );
  });
});

test("hex", async (t) => {
  await t.test("encode bytes", () => {
    assert.deepStrictEqual(toHex(new Uint8Array([0, 15, 255])), "000fff");
    assert.deepStrictEqual(toHex(new ArrayBuffer(0)), "");
  });

  await t.test("ignore byte offset", () => {
    const buffer = new Uint8Array([1, 2, 3, 4]).subarray(1, 3);

    assert.deepStrictEqual(toHex(buffer), "0203");
    assert.deepStrictEqual(toHex(buffer.buffer), "01020304");
  });

  await t.test("decode hex", () => {
    assert.deepStrictEqual(fromHex("000fFf"), new Uint8Array([0, 15, 255]));
    assert.deepStrictEqual(fromHex(""), new Uint8Array(0));
  });

  await t.test("reject invalid hex", () => {
    assert.throws(() => fromHex("abc"), { message: "invalid hex string" });
    assert.throws(() => fromHex("zz"), { message: "invalid hex string" });
  });

  await t.test("round trip", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);
    assert.deepStrictEqual(fromHex(toHex(bytes)), bytes);
  });
});

test("base64url", async (t) => {
  await t.test("encode unpadded", () => {
    assert.deepStrictEqual(toBase64(new Uint8Array([])), "");
    assert.deepStrictEqual(
      toBase64(new Uint8Array([251, 239, 190])),
      "----",
    );
    assert.match(toBase64(new Uint8Array([1, 2, 3])), /^[A-Za-z0-9_-]+$/);
    assert.deepStrictEqual(
      toBase64(new Uint8Array([1, 2, 3])).includes("="),
      false,
    );
  });

  await t.test("decode padded and unpadded", () => {
    const bytes = new Uint8Array([1, 2]);

    assert.deepStrictEqual(toBase64(bytes), "AQI");
    assert.deepStrictEqual(fromBase64("AQI"), bytes);
    assert.deepStrictEqual(fromBase64("AQI="), bytes);
  });

  await t.test("round trip", () => {
    const bytes = new Uint8Array([0, 15, 255, 128, 63]);

    assert.deepStrictEqual(fromBase64(toBase64(bytes)), bytes);
  });
});

test("encode", async (t) => {
  await t.test("encode utf-8", () => {
    assert.deepStrictEqual(encode("abc"), new Uint8Array([97, 98, 99]));
    assert.deepStrictEqual(encode(""), new Uint8Array(0));
    assert.deepStrictEqual(
      encode("ä"),
      new Uint8Array([195, 164]),
    );
  });
});
