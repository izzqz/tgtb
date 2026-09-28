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
 * Build a JSON request body for a Telegram API method, dropping null/undefined
 * params so Telegram does not reject them.
 *
 * @ignore
 * @internal
 * @param params - method params
 * @returns JSON-serialized body
 */
function buildRequestBody(params?: Record<string, unknown>): string {
  if (!params) {
    return "{}";
  }

  const body: Record<string, unknown> = {};
  for (const key in params) {
    const value = params[key];
    if (value === null || value === undefined) {
      continue;
    }
    body[key] = value;
  }

  return JSON.stringify(body);
}

const INITIAL_DELAY_MS = 100;
const MAX_DELAY_MS = 20 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const { fetch_fn, max_retries = 3 } = config as Required<TgtbConfig>;
  return async <M extends BotMethodKeys<F>, F = unknown>(
    method: M,
    params?: Opts<F>[M],
  ): Promise<ApiResponse<ReturnType<ApiMethods<F>[M]>>> => {
    const url = createMethodUrl(bot_token, config, method);
    const body = buildRequestBody(params as Record<string, unknown> | undefined);

    let delay = 0;
    const backoff = () => {
      const wait = delay;
      delay = Math.min(MAX_DELAY_MS, delay === 0 ? INITIAL_DELAY_MS : delay * 2);
      return sleep(wait);
    };

    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch_fn(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      } catch (error) {
        if (attempt >= max_retries) throw error;
        await backoff();
        continue;
      }

      let result: ApiResponse<ReturnType<ApiMethods<F>[M]>>;
      try {
        result = await response.json();
      } catch {
        // proxy HTML error page
        if (attempt >= max_retries) {
          throw new Error(
            `tgtb: non-JSON response for ${method} (HTTP ${response.status})`,
          );
        }
        await backoff();
        continue;
      }

      // non-object JSON from proxy
      if (result === null || typeof result !== "object") {
        if (attempt >= max_retries) {
          throw new Error(
            `tgtb: malformed response for ${method} (HTTP ${response.status})`,
          );
        }
        await backoff();
        continue;
      }

      if (result.ok) return result;

      if (result.error_code === 429) {
        if (attempt >= max_retries) return result;

        // retry_after description fallback
        const retry_after = result.parameters?.retry_after ??
          Number(/retry after (\d+)/i.exec(result.description)?.[1] ?? 0);

        if (retry_after > 0) {
          await sleep(retry_after * 1000);
          delay = 0; // wait covered the backoff
        } else {
          await backoff();
        }
        continue;
      }

      // 5xx transient, 4xx terminal
      if ((result.error_code ?? 0) >= 500 && attempt < max_retries) {
        await backoff();
        continue;
      }

      return result;
    }
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

      // expose .url
      Object.defineProperty(methodFn, "url", {
        get: () => createMethodUrl(bot_token, config, method).toString(),
      });

      return methodFn;
    },
  }) as TelegramAPI<F>;
}
