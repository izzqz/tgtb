import type { ApiMethods, ApiResponse, Opts } from "./telegram.ts";

export type { ApiMethods, ApiResponse, Opts } from "./telegram.ts";

export type BotMethodKeys<F> = keyof ApiMethods<F>;
export type BotMethodParams<F, M extends BotMethodKeys<F>> = Parameters<ApiMethods<F>[M]>[0];
export type BotMethodReturn<F, M extends BotMethodKeys<F>> = ReturnType<ApiMethods<F>[M]>;
export type BotMethodResponse<F, M extends BotMethodKeys<F>> = Promise<ApiResponse<ReturnType<ApiMethods<F>[M]>>>;

export interface TgtbClient<F = unknown> {
  callMethod: <M extends BotMethodKeys<F>>(
    method: M,
    params?: Opts<F>[M]
  ) => Promise<ApiResponse<ReturnType<ApiMethods<F>[M]>>>;
  isInitDataValid: (init_data: string) => boolean;
}

export interface TgtbOptions {
  fetch_fn?: typeof fetch;
  base_url?: string;
}

export interface TgtbConfig extends Required<TgtbOptions> {
  bot_token: string;
}