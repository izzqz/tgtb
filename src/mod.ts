import buildCallMethod from "./factories/call_method.ts";

import { deepMerge } from "jsr:@std/collections/deep-merge";

export interface TgtbOptions {
  fetch_fn?: typeof fetch;
  base_url?: string;
}

export const DEFAULT_OPTIONS: TgtbOptions = {
  fetch_fn: globalThis.fetch,
  base_url: "https://api.telegram.org/bot",
};

export default function tgtb(bot_token: string, options?: TgtbOptions) {
  const mergedOptions = deepMerge(
    DEFAULT_OPTIONS as Record<string, unknown>,
    options as Record<string, unknown>,
  ) as Required<TgtbOptions>;

  return {
    callMethod: buildCallMethod(bot_token, mergedOptions),
  };
}

export * as types from "./types/telegram.ts";
