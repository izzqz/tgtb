import type { 
  BotMethodKeys, 
  BotMethodParams,
  TgtbConfig,
  BotMethodResponse
} from "../types/api.ts";

export default function buildCallMethod(
  bot_token: string,
  options: TgtbConfig,
) {
  const { fetch_fn, base_url } = options;
  return async <M extends BotMethodKeys>(
    method: M,
    params?: BotMethodParams<M>,
  ): Promise<BotMethodResponse<M>> => {
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
    const result = await response.json() as BotMethodResponse<M>;

    return result;
  };
}
