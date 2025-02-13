import buildCallMethod from "./factories/call_method.ts";
import { deepMerge } from "jsr:@std/collections/deep-merge";
import type { TgtbOptions, TgtbClient, TgtbConfig } from "./types/api.ts";
import createValidateWebapp from "./factories/validate_webapp.ts";

export { type TgtbOptions, type TgtbClient } from "./types/api.ts";

export const DEFAULT_OPTIONS: Record<string, unknown> = {
  fetch_fn: globalThis.fetch,
  base_url: "https://api.telegram.org/bot",
};

export default function tgtb(bot_token: string, options?: TgtbOptions): TgtbClient {
  const mergedOptions = {
    ...deepMerge(
      DEFAULT_OPTIONS,
      options ? options as Record<string, unknown> : {},
    ),
    bot_token,
  } as TgtbConfig;
  return {
    callMethod: buildCallMethod(bot_token, mergedOptions),
    isInitDataValid: createValidateWebapp(bot_token),
  };
}

export * as types from "./types/telegram.ts";
