import type { ApiMethods, ApiResponse, Opts } from "./telegram.ts";

export type { ApiMethods, ApiResponse, Opts } from "./telegram.ts";

/**
 * List of all bot API methods
 * @internal
 */
export type BotMethodKeys<F> = keyof ApiMethods<F>;

/**
 * Generic type for bot method parameters
 * @internal
 */
export type BotMethodParams<F, M extends BotMethodKeys<F>> = Parameters<
  ApiMethods<F>[M]
>[0];

/**
 * Generic type for bot method return value
 * @internal
 */
export type BotMethodReturn<F, M extends BotMethodKeys<F>> = ReturnType<
  ApiMethods<F>[M]
>;

/**
 * Generic type for bot method response
 * @internal
 */
export type BotMethodResponse<F, M extends BotMethodKeys<F>> = Promise<
  ApiResponse<ReturnType<ApiMethods<F>[M]>>
>;

/**
 * Type that converts all API methods to return Promises with ApiResponse
 * @internal
 */
export type TelegramAPI<F> = {
  [M in keyof ApiMethods<F>]: (
    params?: Opts<F>[M]
  ) => Promise<ApiResponse<ReturnType<ApiMethods<F>[M]>>>;
};

/**
 * tgtb client
 */
export interface Client<F = unknown> {
  /**
   * Direct access to Telegram API methods
   * 
   * For every method see [Telegram Bot API](https://core.telegram.org/bots/api)
   * 
   * @example
   * ```ts
   * import tgtb from "@izzqz/tgtb";
   * 
   * const bot = tgtb(bot_token, options);
   * 
   * const res = await bot.api.sendMessage({
   *   chat_id: 123456,
   *   text: "Hello, world!"
   * });
   * 
   * if (res.ok) {
   *   console.log(res.result); // { message_id: 123456 }
   * } else {
   *   console.error(res.description); // "Bad Request: chat not found"
   * }
   * ```
   */
  api: TelegramAPI<F>;

  /**
   * Methods to validate data from webapp
   * 
   * @example
   * ```ts
   * import tgtb from "@izzqz/tgtb";
   * 
   * const bot = tgtb(bot_token, options);
   * 
   * const initData = "";
   * 
   * // this method return boolean
   * bot.init_data.isValid(initData); // boolean
   * 
   * // this method throw error with message if invalid
   * bot.init_data.validate(initData); // true or Error
   * ```
   */
  init_data: {
    /**
     * Validate data from webapp and return boolean
     */
    isValid: (init_data: string) => boolean;
    /**
     * Validate data from webapp and trow if not valid
     */
    validate: (init_data: string) => true | Error;
  }
}

/**
 * tgtb config
 */
export interface TgtbConfig {
  /**
   * Fetch function to use for api requests
   * 
   * @default globalThis.fetch
   */
  fetch_fn?: typeof fetch;
  /**
   * Base url for api requests
   * @default "https://api.telegram.org/bot"
   */
  base_url?: string;
  /**
   * If true, the tgtb will use test endpoint `https://api.telegram.org/bot<token>/test/METHOD_NAME`
   * @see https://core.telegram.org/bots/features#testing-your-bot
   */
  use_test_mode?: boolean;
}
