import { type TgtbOptions } from "../mod.ts";
import type { ApiMethods } from "../types/telegram.ts";

export default function buildCallMethod(
  bot_token: string,
  options: Required<TgtbOptions>,
) {
  const { fetch_fn, base_url } = options;
  return async (method: BotMethod, params?: any) => {
    const url = new URL(base_url.concat(bot_token, '/', method));

    // append params
    for (const key in params) {
      const value = (params as Record<string, unknown>)[key];
      
      if (typeof value === 'object' && value !== null) {
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
