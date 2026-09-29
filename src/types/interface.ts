/**
 * Types and interfaces for tgtb
 * @module
 */

import type {
  ApiMethods,
  ApiResponse,
  Opts,
  TelegramOAuthUser,
  Update,
} from "./telegram.ts";

export type { ApiMethods, ApiResponse, Opts } from "./telegram.ts";

/**
 * Options for long polling
 */
export interface PollingOptions {
  /**
   * Long poll timeout in seconds
   * @default 50
   */
  timeout?: number;
  /**
   * Limits the number of updates to be retrieved, 1-100
   * @see https://core.telegram.org/bots/api#getupdates
   */
  limit?: number;
  /**
   * List of update types to receive
   */
  allowed_updates?: ReadonlyArray<Exclude<keyof Update, "update_id">>;
  /**
   * Delete an existing webhook before polling starts
   * getUpdates returns 409 Conflict while a webhook is set
   * @default true
   */
  delete_webhook?: boolean;
  /**
   * First backoff wait after a failed poll, doubled on each
   * subsequent consecutive failure
   * @default 1000
   */
  backoff_min_ms?: number;
  /**
   * Upper bound for the backoff wait
   * @default 30000
   */
  backoff_max_ms?: number;
}

/**
 * Long polling tools
 */
export interface PollingTools {
  /**
   * Start long polling and yield updates
   *
   * Offset advances only after the consumer requests the next update,
   * so a thrown handler error redelivers the update on restart
   *
   * @example Poll updates
   * ```ts
   * import tgtb from "@izzqz/tgtb";
   *
   * const bot = tgtb("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11");
   *
   * for await (const update of bot.polling.updates()) {
   *   console.log(update.update_id);
   * }
   * ```
   */
  updates(options?: PollingOptions): AsyncGenerator<Update, void, unknown>;
  /**
   * Stop polling after the in-flight getUpdates request returns
   */
  stop(): void;
}

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
 * Type for API methods that can be called
 * @internal
 */
export type APIMethod<F, M extends keyof ApiMethods<F>> = {
  (params?: Opts<F>[M]): Promise<ApiResponse<ReturnType<ApiMethods<F>[M]>>>;
  /**
   * URL for the API method
   */
  url: string;
};

/**
 * Type for Telegram API methods in tgtb
 * @internal
 */
export type TelegramAPI<F> = {
  [M in keyof ApiMethods<F>]: APIMethod<F, M>;
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
   * @example Call method
   * ```ts
   * import tgtb from "@izzqz/tgtb";
   *
   * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
   *
   * const bot = tgtb(bot_token);
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
   *
   * @example Get method URL
   * ```ts
   * import tgtb from "@izzqz/tgtb";
   *
   * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
   *
   * const url = tgtb(bot_token).api.getMe.url;
   * // https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/getMe
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
   * const bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
   *
   * const bot = tgtb(bot_token);
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
    isValid: (init_data: string) => Promise<boolean>;
    /**
     * Validate data from webapp and trow if not valid
     */
    validate: (init_data: string) => Promise<void>;
  };

  oauth: {
    /**
     * Validate user data from telegram widget and return boolean
     */
    isValid: (oauth_user: TelegramOAuthUser) => Promise<boolean>;
    /**
     * Validate user data from telegram widget and trow if not valid
     */
    validate: (oauth_user: TelegramOAuthUser) => Promise<void>;
  };

  /**
   * Long polling tools
   */
  polling: PollingTools;
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
  /**
   * Time in seconds after which the hash will be considered expired
   * If 0, null, or undefined, expiration check is disabled
   * @default null (disabled)
   */
  hash_expiration?: number | null;
  /**
   * Ed25519 public key, as 32 bytes hex, used to validate third-party signed init data
   * If null or undefined, signature validation is disabled
   * @see [TELEGRAM_ED25519_PUBLIC_KEY](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
   * @default null (disabled)
   */
  ed25519_public_key?: string | null;
  /**
   * Number of times to retry a request on a 429, 5xx, network, or
   * malformed-response failure, waiting `retry_after` seconds on 429 and
   * backing off exponentially otherwise
   * If 0, retrying is disabled
   * @default 3
   */
  max_retries?: number;
}
