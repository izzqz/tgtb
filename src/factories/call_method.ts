import { type TgtbOptions } from "../mod.ts";
import type { ApiMethods } from "../types/telegram.ts";

type BotMethodKeys = keyof ApiMethods<unknown>;
type BotMethodParams<M extends BotMethodKeys> = Parameters<ApiMethods<unknown>[M]>[0];
type BotMethodReturn<M extends BotMethodKeys> = ReturnType<ApiMethods<unknown>[M]>;

export default function buildCallMethod(
  bot_token: string,
  options: Required<TgtbOptions>,
) {
  const { fetch_fn, base_url } = options;
  return async <M extends BotMethodKeys>(
    method: M,
    params?: BotMethodParams<M>,
  ): Promise<BotMethodReturn<M>> => {
    const url = new URL(base_url.concat(bot_token, "/", method));

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
    const result = await response.json();

    return result;
  };
}
