import { create_oauth_validator } from "../../lib/tg_validator.js";
import type { TgtbConfig } from "../types/interface.ts";
import type { TelegramOAuthUser } from "../types/telegram.ts";
/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 * @returns
 */
export default function buildInitDataTools(
  bot_token: string,
  { hash_expiration }: TgtbConfig,
) {
  const validate = create_oauth_validator(bot_token, hash_expiration);

  return {
    isValid: (oauth_user: TelegramOAuthUser): boolean => {
      try {
        validate(oauth_user);
        return true;
      } catch {
        return false;
      }
    },
    validate: (oauth_user: TelegramOAuthUser): true | Error =>
      validate(oauth_user),
  };
}
