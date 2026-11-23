import type {
  ApiMethods,
  ApiResponse,
  BotMethodKeys,
  Opts,
  TelegramAPI,
  TgtbConfig,
} from "../types/interface.ts";

/**
 * Build the URL for a Telegram API method
 *
 * @ignore
 * @internal
 */
function createMethodUrl(
  bot_token: string,
  { base_url, use_test_mode }: Required<TgtbConfig>,
  method: string,
): string {
  return `${base_url}${bot_token}${use_test_mode ? "/test/" : "/"}${method}`;
}

/**
 * Build a JSON request body, dropping null/undefined params so Telegram
 * does not reject them
 *
 * @ignore
 * @internal
 */
function buildRequestBody(params?: object): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(params ?? {}).filter(([, value]) => value != null),
    ),
  );
}

const INITIAL_DELAY_MS = 100;
const MAX_DELAY_MS = 10_000;
/** Longer 429 waits are returned to the caller instead of blocking the call */
const MAX_RETRY_AFTER_S = 60;

/**
 * @ignore
 * @internal
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Methods that are safe to resend when the outcome of a request is unknown
 * (network error, 5xx, unreadable response): the request may have been
 * executed, and resending `sendMessage` would post a duplicate
 *
 * @ignore
 * @internal
 */
export function isReadOnlyMethod(method: string): boolean {
  return /^get/i.test(method);
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
  config: Required<TgtbConfig>,
) {
  const { fetch_fn, max_retries } = config;
  return async <M extends BotMethodKeys<F>, F = unknown>(
    method: M,
    params?: Opts<F>[M],
  ): Promise<ApiResponse<ReturnType<ApiMethods<F>[M]>>> => {
    const url = createMethodUrl(bot_token, config, method);
    const body = buildRequestBody(params as object | undefined);
    // 429 means the request was not executed, so it is retried for any method
    const max_unknown_retries = isReadOnlyMethod(method) ? max_retries : 0;

    let delay = INITIAL_DELAY_MS;
    const backoff = () => {
      const wait = delay;
      delay = Math.min(MAX_DELAY_MS, delay * 2);
      return sleep(wait);
    };

    for (let attempt = 0;; attempt++) {
      const can_retry_unknown = attempt < max_unknown_retries;

      let response: Response;
      try {
        response = await fetch_fn(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      } catch (error) {
        if (!can_retry_unknown) throw error;
        await backoff();
        continue;
      }

      let result: ApiResponse<ReturnType<ApiMethods<F>[M]>> | null;
      try {
        result = await response.json();
      } catch {
        result = null; // proxy HTML error page
      }

      // non-JSON or non-object JSON from a proxy
      if (result === null || typeof result !== "object") {
        if (!can_retry_unknown) {
          throw new Error(
            `tgtb: malformed response for ${method} (HTTP ${response.status})`,
          );
        }
        await backoff();
        continue;
      }

      if (result.ok) return result;

      if (result.error_code === 429) {
        // retry_after description fallback
        const retry_after = result.parameters?.retry_after ??
          Number(/retry after (\d+)/i.exec(result.description)?.[1] ?? 0);

        if (attempt >= max_retries || retry_after > MAX_RETRY_AFTER_S) {
          return result;
        }

        if (retry_after > 0) await sleep(retry_after * 1000);
        else await backoff();
        continue;
      }

      // 5xx transient, 4xx terminal
      if ((result.error_code ?? 0) >= 500 && can_retry_unknown) {
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
  config: Required<TgtbConfig>,
): TelegramAPI<F> {
  const callMethod = buildCallMethod(bot_token, config);

  return new Proxy({}, {
    get(_, method) {
      // `then` would make the client a thenable that hangs `await`
      if (typeof method !== "string" || method === "then") return undefined;

      const methodFn = (params?: Opts<F>[keyof ApiMethods<F>]) =>
        callMethod(method as BotMethodKeys<F>, params);

      return Object.defineProperty(methodFn, "url", {
        get: () => createMethodUrl(bot_token, config, method),
      });
    },
  }) as TelegramAPI<F>;
}
