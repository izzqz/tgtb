import type { TgtbConfig } from "../types/interface.ts";
import { WEB_APP_UINT8 } from "../constants.ts";
import {
  createDataCheckString,
  encode,
  fromBase64,
  fromHex,
  importEd25519,
  importHMAC,
  signHMAC,
  timingSafeEqual,
  toHex,
  verifyEd25519,
} from "../utils/crypto.ts";
import { assertFresh, validationTools } from "./validator.ts";

const ED25519_PUBLIC_KEY_BYTES = 32;

function parseEd25519PublicKey(hex: string | null): Uint8Array<ArrayBuffer> | null {
  if (!hex) return null;

  const bytes = fromHex(hex);

  if (bytes.length !== ED25519_PUBLIC_KEY_BYTES) {
    throw new Error(
      `ed25519_public_key must be ${ED25519_PUBLIC_KEY_BYTES} bytes, got ${bytes.length}`,
    );
  }

  return bytes;
}

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 */
export default function buildInitDataTools(
  bot_token: string,
  { hash_expiration, ed25519_public_key }: Required<TgtbConfig>,
) {
  const secret_key = importHMAC(WEB_APP_UINT8)
    .then((key) => signHMAC(key, encode(bot_token)))
    .then(importHMAC);

  const public_key_bytes = parseEd25519PublicKey(ed25519_public_key);
  // imported lazily: an eager rejection would be unhandled on runtimes without Ed25519
  let public_key: Promise<CryptoKey> | undefined;

  const bot_id = bot_token.split(":")[0];

  return validationTools(async (init_data: string) => {
    if (!init_data) throw new Error("init_data is nullish");

    const params = new URLSearchParams(init_data);

    const hash = params.get("hash");
    const signature = params.get("signature");

    if (!hash && !signature) {
      throw new Error("no hash or signature in init_data");
    }

    // third-party validation, no bot token
    if (signature && public_key_bytes) {
      public_key ??= importEd25519(public_key_bytes);
      const data_check_string = createDataCheckString(params.entries(), [
        "hash",
        "signature",
      ]);

      const verified = await verifyEd25519(
        await public_key,
        fromBase64(signature),
        encode(`${bot_id}:WebAppData\n${data_check_string}`),
      );

      if (!verified) throw new Error("signature mismatch");
    }

    if (hash) {
      const computed_hash = toHex(
        await signHMAC(
          await secret_key,
          encode(createDataCheckString(params.entries())),
        ),
      );

      if (!timingSafeEqual(hash, computed_hash)) {
        throw new Error("hash mismatch");
      }
    } else if (!public_key_bytes) {
      throw new Error("no hash in init_data");
    }

    assertFresh(params.get("auth_date"), hash_expiration);
  });
}
