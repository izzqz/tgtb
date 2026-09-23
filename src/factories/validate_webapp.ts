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

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 */
export default function buildInitDataTools(
  bot_token: string,
  { hash_expiration, ed25519_public_key }: TgtbConfig,
) {
  const validate = createInitDataValidator(
    bot_token,
    hash_expiration,
    ed25519_public_key,
  );

  return {
    isValid: async (init_data: string): Promise<boolean> => {
      return await validate(init_data)
        .then(() => true)
        .catch(() => false);
    },
    validate,
  };
}

const ED25519_PUBLIC_KEY_BYTES = 32;

function parseEd25519PublicKey(
  hex: string | null | undefined,
): Uint8Array<ArrayBuffer> | null {
  if (!hex) return null;

  const bytes = fromHex(hex);

  if (bytes.length !== ED25519_PUBLIC_KEY_BYTES) {
    throw new Error(
      `ed25519_public_key must be ${ED25519_PUBLIC_KEY_BYTES} bytes, got ${bytes.length}`,
    );
  }

  return bytes;
}

function createInitDataValidator(
  bot_token: string,
  hash_expiration: number | null | undefined,
  ed25519_public_key: string | null | undefined,
) {
  const secret_key = importHMAC(WEB_APP_UINT8).then((key) =>
    signHMAC(key, encode(bot_token))
  );

  const public_key = parseEd25519PublicKey(ed25519_public_key);

  const bot_id = bot_token.split(":")[0];

  return async (init_data: string): Promise<void> => {
    if (!init_data) throw new Error("init_data is nullish");

    const params = new URLSearchParams(init_data);

    const hash = params.get("hash");
    const signature = params.get("signature");

    if (!hash && !signature) {
      throw new Error("no hash or signature in init_data");
    }

    // third-party validation, no bot token
    if (signature && public_key) {
      const data_check_string = createDataCheckString(params.entries(), [
        "hash",
        "signature",
      ]);

      const verified = await verifyEd25519(
        await importEd25519(public_key),
        fromBase64(signature),
        encode(`${bot_id}:WebAppData\n${data_check_string}`),
      );

      if (!verified) throw new Error("signature mismatch");
    }

    if (hash) {
      const data_check_string = createDataCheckString(params.entries());

      const computed_hash = toHex(
        await signHMAC(
          await importHMAC(await secret_key),
          encode(data_check_string),
        ),
      );

      if (!timingSafeEqual(hash, computed_hash)) {
        throw new Error("hash mismatch");
      }
    } else if (!public_key) {
      throw new Error("no hash in init_data");
    }

    const auth_date = Number(params.get("auth_date"));

    if (hash_expiration && auth_date) {
      if (Math.floor(Date.now() / 1000) - auth_date >= hash_expiration) {
        throw new Error("hash expired");
      }
    }
  };
}
