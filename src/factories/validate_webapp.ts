import type { TgtbConfig } from "../types/interface.ts";
import { WEB_APP_UINT8 } from "../constants.ts";
import {
  createDataCheckString,
  encode,
  importHMAC,
  signHMAC,
} from "../utils/crypto.ts";

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 */
export default function buildInitDataTools(
  bot_token: string,
  { hash_expiration }: TgtbConfig,
) {
  const validate = createInitDataValidator(bot_token, hash_expiration);

  return {
    isValid: async (init_data: string): Promise<boolean> => {
      return await validate(init_data)
        .then(() => true)
        .catch(() => false);
    },
    validate,
  };
}

function createInitDataValidator(
  bot_token: string,
  hash_expiration: number | null | undefined,
) {
  const secret_key = importHMAC(WEB_APP_UINT8).then((key) =>
    signHMAC(key, encode(bot_token))
  );

  const prepareData = (init_data: string) => {
    const e = new URLSearchParams(init_data);

    const data_check_string = createDataCheckString(e.entries());

    return {
      data_check_string,
      hash: String(e.get("hash")),
      auth_date: Number(e.get("auth_date")),
    };
  };

  return async (init_data: string): Promise<void> => {
    if (!init_data) throw new Error("init_data is nullish");

    const { data_check_string, hash, auth_date } = prepareData(init_data);

    const computed_hash = await importHMAC(await secret_key)
      .then((k) => signHMAC(k, encode(data_check_string)))
      .then((s) => Array.from(new Uint8Array(s)))
      .then((s) => s.map((b) => b.toString(16).padStart(2, "0")).join(""));

    if (hash !== computed_hash) {
      throw new Error("hash mismatch");
    }

    if (hash_expiration && auth_date) {
      if (Date.now() - auth_date * 1000 >= hash_expiration) {
        throw new Error("hash expired");
      }
    }
  };
}
