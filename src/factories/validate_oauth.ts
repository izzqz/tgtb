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
import { assertFresh, validationTools } from "./validator.ts";

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 */
export default function buildOAuthTools(
  bot_token: string,
  { hash_expiration }: Required<TgtbConfig>,
) {
  const secret_key = crypto.subtle.digest("SHA-256", encode(bot_token))
    .then(importHMAC);

  return validationTools(async (oauth_user: TelegramOAuthUser) => {
    if (!oauth_user) throw new Error("oauth_user is nullish");
    if (!("hash" in oauth_user)) throw new Error("no hash in oauth_user");

    const computed_hash = toHex(
      await signHMAC(
        await secret_key,
        encode(createDataCheckString(Object.entries(oauth_user))),
      ),
    );

    if (!timingSafeEqual(computed_hash, String(oauth_user.hash))) {
      throw new Error("hash mismatch");
    }

    assertFresh(oauth_user.auth_date, hash_expiration);
  });
}
