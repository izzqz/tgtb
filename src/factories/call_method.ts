import type {
  ApiMethods,
  ApiResponse,
  BotMethodKeys,
  Opts,
  TelegramAPI,
  TgtbConfig,
} from "../types/interface.ts";

/**
 * Build the base URL for a Telegram API method
 *
 * @ignore
 * @internal
 * @param bot_token - Telegram bot token
 * @param config - tgtb options
 * @param method - API method name
 * @returns URL for the API method
 */
function createMethodUrl(
  bot_token: string,
  config: TgtbConfig,
  method: string,
): URL {
  const { base_url } = config as Required<TgtbConfig>;
  const postfix = config.use_test_mode ? "/test/" : "/";
  return new URL(base_url.concat(bot_token, postfix, method));
}

/**
 * Build a function to call a method
 *
 * @ignore
 * @internal
 * @param bot_token - Telegram bot token
 * @param config - tgtb options
 * @returns a function to call a method
 */
export function buildCallMethod(
  bot_token: string,
  config: TgtbConfig,
) {
  const { fetch_fn } = config as Required<TgtbConfig>;
  return async <M extends BotMethodKeys<F>, F = unknown>(
    method: M,
    params?: Opts<F>[M],
  ): Promise<ApiResponse<ReturnType<ApiMethods<F>[M]>>> => {
    const url = createMethodUrl(bot_token, config, method);

    // append params
    for (const key in params) {
      const value = (params as Record<string, unknown>)[key];

      if (typeof value === "object" && value !== null) {
        url.searchParams.set(key, JSON.stringify(value));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch_fn(url.toString());
    const result = await response.json() as ApiResponse<
      ReturnType<ApiMethods<F>[M]>
    >;

    return result;
  };
}

/**
 * Build a proxy to call Telegram API methods
 *
 * @ignore
 * @internal
 * @param bot_token - Telegram bot token
 * @param config - tgtb options
 * @returns Proxy object to call Telegram API methods
 */
export default function buildAPICaller<F>(
  bot_token: string,
  config: TgtbConfig,
): TelegramAPI<F> {
  const callMethod = buildCallMethod(bot_token, config);

  return new Proxy({}, {
    get(_, method: string) {
      const methodFn = async (params?: Opts<F>[keyof ApiMethods<F>]) => {
        return await callMethod(method as BotMethodKeys<F>, params);
      };

      // Add url property to the function
      Object.defineProperty(methodFn, "url", {
        get: () => createMethodUrl(bot_token, config, method).toString(),
      });

      return methodFn;
    },
  }) as TelegramAPI<F>;
}
