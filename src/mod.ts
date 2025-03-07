/**
 * Utility library for Telegram API, especially useful for testing
 * But powerful enough to be used full featured telegram bot or integrations
 *
 * ## Features
 *
 * - Call API methods
 * - Validate data from webapp
 * - Testing functions
 *
 * @example Create a bot instance and call API methods
 * ```ts
 * import tgtb from "@izzqz/tgtb";
 *
 * // create a bot instance with a bot token
 * const bot = tgtb("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11");
 *
 * // call a method
 * const res = await bot.api.getMe();
 *
 * // it does not throw an error when ok is false
 * if (res.ok) {
 *   console.log(res.result); // { id: 123456, is_bot: true, first_name: 'John', username: 'john_bot' }
 * } else {
 *   console.error(res.description);
 * }
 * ```
 *
 * @module
 */

import type { Client, TgtbConfig } from "./types/interface.ts";
import buildInitDataTools from "./factories/validate_webapp.ts";
import buildAPICaller from "./factories/call_method.ts";
import buildOAuthTools from "./factories/validate_oauth.ts";

/**
 * Default options for the TgtbClient
 * @internal
 */
export const DEFAULT_CONFIG: Required<TgtbConfig> = Object.freeze({
  fetch_fn: globalThis.fetch,
  base_url: "https://api.telegram.org/bot",
  use_test_mode: false,
  hash_expiration: null,
});

/**
 * Creates a new TgtbClient instance
 *
 * @example call API methods
 * ```ts
 * import tgtb, { TgtbConfig } from "@izzqz/tgtb";
 *
 * const options: TgtbConfig = {
 *   fetch_fn: globalThis.fetch,
 *   base_url: "https://api.telegram.org/bot",
 *   use_test_mode: false
 * };
 *
 * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
 *
 * const bot = tgtb(bot_token, options);
 *
 * bot; // TgtbClient
 *
 * // call a method
 * const res = await bot.api.sendMessage({
 *   chat_id: 123456,
 *   text: "Hello, world!"
 * });
 *
 * res; // ApiResponse<SendMessage>
 * ```
 *
 * @param bot_token - Telegram bot token
 * @param config - tgtb options
 * @returns A new TgtbClient instance
 */
export default function tgtb(
  bot_token: string,
  config?: TgtbConfig,
): Client {
  const mergedConfig: TgtbConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  return {
    api: buildAPICaller(bot_token, mergedConfig),
    // TODO: fix malocc error
    // init_data: buildInitDataTools(bot_token, mergedConfig),
    // oauth: buildOAuthTools(bot_token, mergedConfig),
  };
}

export type * from "./types/interface.ts";
