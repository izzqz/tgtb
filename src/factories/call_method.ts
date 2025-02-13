import type {
  ApiMethods,
  ApiResponse,
  BotMethodKeys,
  Opts,
  TgtbConfig,
} from "../types/api.ts";

export default function buildCallMethod(
  bot_token: string,
  options: TgtbConfig,
) {
  const { fetch_fn, base_url } = options;
  return async <M extends BotMethodKeys<F>, F = unknown>(
    method: M,
    params?: Opts<F>[M],
  ): Promise<ApiResponse<ReturnType<ApiMethods<F>[M]>>> => {
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
    const result = await response.json() as ApiResponse<
      ReturnType<ApiMethods<F>[M]>
    >;

    return result;
  };
}
