// import { create_oauth_validator } from "../../lib/tg_validator.js";
import type { TgtbConfig } from "../types/interface.ts";
import type { TelegramOAuthUser } from "../types/telegram.ts";

function createOauthValidator(
  bot_token: string,
  hash_expiration: number | null | undefined, // in seconds, not milliseconds
) {
  const encode = TextEncoder.prototype.encode.bind(new TextEncoder());

  return async (oauth_user: TelegramOAuthUser): Promise<void> => {
    if (!oauth_user) throw new Error("oauth_user is nullish");
    if (!("hash" in oauth_user)) throw new Error("Data is NOT from Telegram");

    // Extract hash and remove it from the data to be validated
    const check_hash = oauth_user.hash;
    const auth_data = { ...oauth_user } as Partial<TelegramOAuthUser>;
    delete auth_data.hash;

    if (!check_hash) throw new Error("Data is NOT from Telegram");

    // Build data check array exactly like PHP
    const data_check_arr: string[] = [];
    for (const [key, value] of Object.entries(auth_data)) {
      if (value != null) {
        data_check_arr.push(`${key}=${value}`);
      }
    }

    // Sort like PHP's sort()
    data_check_arr.sort();

    // Join with newlines like PHP's implode("\n", $data_check_arr)
    const data_check_string = data_check_arr.join("\n");

    // Create SHA-256 hash of bot token (like PHP's hash('sha256', BOT_TOKEN, true))
    const secret_key = await crypto.subtle.digest(
      "SHA-256",
      encode(bot_token),
    );

    // Create HMAC key for SHA-256
    const hmac_key = await crypto.subtle.importKey(
      "raw",
      secret_key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    // Calculate HMAC (like PHP's hash_hmac('sha256', $data_check_string, $secret_key))
    const signature = await crypto.subtle.sign(
      "HMAC",
      hmac_key,
      encode(data_check_string),
    );
    const signatureBytes = Array.from(new Uint8Array(signature));
    const computed_hash = signatureBytes.map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    // Compare hashes (like PHP's strcmp($hash, $check_hash) !== 0)
    if (computed_hash !== check_hash) {
      throw new Error("Data is NOT from Telegram");
    }

    // Check expiration only if a positive expiration time is set and we have an auth_date
    if (
      typeof hash_expiration === "number" &&
      hash_expiration > 0 &&
      auth_data.auth_date !== undefined
    ) {
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      const authTimeSeconds = auth_data.auth_date;
      const expirationSeconds = hash_expiration; // hash_expiration is already in seconds

      // The data is outdated if time difference is GREATER THAN OR EQUAL to the expiration period
      // This matches the test expectation that exactly 60 seconds is considered expired
      if (currentTimeSeconds - authTimeSeconds >= expirationSeconds) {
        throw new Error("Data is outdated");
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
export default function buildInitDataTools(
  bot_token: string,
  { hash_expiration }: TgtbConfig,
) {
  const validate = createOauthValidator(bot_token, hash_expiration);

  return {
    isValid: async (oauth_user: TelegramOAuthUser): Promise<boolean> => {
      try {
        await validate(oauth_user);
        return true;
      } catch {
        return false;
      }
    },
    validate: async (oauth_user: TelegramOAuthUser): Promise<void> => {
      try {
        await validate(oauth_user);
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
  };
}
