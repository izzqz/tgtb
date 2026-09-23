import type { TgtbConfig } from "../types/interface.ts";
import type { TelegramOAuthUser } from "../types/telegram.ts";
import {
  createDataCheckString,
  encode,
  importHMAC,
  signHMAC,
  timingSafeEqual,
  toHex,
} from "../utils/crypto.ts";

function createOauthValidator(
  bot_token: string,
  hash_expiration: number | null | undefined, // in seconds, not milliseconds
) {
  const secret_key = crypto.subtle.digest(
    "SHA-256",
    encode(bot_token),
  ).then((key) => importHMAC(key));

  const prepareData = (oauth_user: TelegramOAuthUser) => {
    const data_check_string = createDataCheckString(Object.entries(oauth_user));

    return {
      data_check_string,
      hash: String(oauth_user.hash),
      auth_date: Number(oauth_user.auth_date),
    };
  };

  return async (oauth_user: TelegramOAuthUser): Promise<void> => {
    if (!oauth_user) throw new Error("oauth_user is nullish");
    if (!("hash" in oauth_user)) throw new Error("no hash in oauth_user");

    const { data_check_string, hash, auth_date } = prepareData(oauth_user);

    const computed_hash = toHex(
      await signHMAC(await secret_key, encode(data_check_string)),
    );

    if (!timingSafeEqual(computed_hash, hash)) {
      throw new Error("hash mismatch");
    }

    if (hash_expiration && auth_date) {
      if (Math.floor(Date.now() / 1000) - auth_date >= hash_expiration) {
        throw new Error("hash is outdated");
      }
    }
  };
}

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 * @returns
 */
export default function buildOAuthTools(
  bot_token: string,
  { hash_expiration }: TgtbConfig,
) {
  const validate = createOauthValidator(bot_token, hash_expiration);

  return {
    isValid: async (oauth_user: TelegramOAuthUser): Promise<boolean> => {
      return await validate(oauth_user)
        .then(() => true)
        .catch(() => false);
    },
    validate,
  };
}
