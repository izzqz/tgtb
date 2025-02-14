/**
 * 
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
 * const res = await bot.callMethod("getMe");
 * 
 * // it does not throw an error when ok is false
 * if (res.ok) {
 *   console.log(res.result); // { id: 123456, is_bot: true, first_name: 'John', username: 'john_bot' }
 * } else {
 *   console.error(res.description);
 * }
 * ```
 * 
 * @example Validate data from webapp
 * ```ts
 * const initData = "";
 * bot.isInitDataValid(initData); // true or Error
 * ```
 * 
 * @module
 */

import buildCallMethod from "./factories/call_method.ts";
import type { TgtbClient, TgtbConfig } from "./types/api.ts";
import createValidateWebapp from "./factories/validate_webapp.ts";

/**
 * Default options for the TgtbClient
 * @internal
 */
export const DEFAULT_OPTIONS: TgtbConfig = Object.freeze({
  fetch_fn: globalThis.fetch,
  base_url: "https://api.telegram.org/bot",
  use_test_mode: false
});

/**
 * Creates a new TgtbClient instance
 * 
 * @example call API methods
 * ```ts
 * import tgtb from "@izzqz/tgtb";
 * 
 * const options: TgtbConfig = {
 *   fetch_fn: globalThis.fetch,
 *   base_url: "https://api.telegram.org/bot",
 *   use_test_mode: false
 * };
 * 
 * const bot = tgtb(bot_token, options);
 * 
 * bot; // TgtbClient
 * 
 * // call a method
 * const res = await bot.callMethod("sendMessage", {
 *   chat_id: 123456,
 *   text: "Hello, world!"
 * });
 * 
 * res; // ApiResponse<SendMessage>
 * ```
 * 
 * @example Validate data from webapp
 * ```ts
 * const initData = "";
 * bot.isInitDataValid(initData); // true or Error
 * ```
 * 
 * @param bot_token - Telegram bot token
 * @param config - tgtb options
 * @returns A new TgtbClient instance
 */
export default function tgtb(
  bot_token: string,
  config?: TgtbConfig,
): TgtbClient {
  const mergedOptions: TgtbConfig = {
    ...DEFAULT_OPTIONS,
    ...config,
  };
  return {
    callMethod: buildCallMethod(bot_token, mergedOptions),
    isInitDataValid: createValidateWebapp(bot_token),
  };
}

export type * from "./types/api.ts";
