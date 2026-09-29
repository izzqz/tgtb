import type {
  PollingOptions,
  PollingTools,
  TgtbConfig,
} from "../types/interface.ts";
import { buildCallMethod } from "./call_method.ts";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 */
export default function buildPollingTools(
  bot_token: string,
  config: TgtbConfig,
): PollingTools {
  const api = buildCallMethod(bot_token, config);
  let running = false;

  return {
    stop() {
      running = false;
    },

    async *updates(options: PollingOptions = {}) {
      const {
        timeout = 50,
        limit,
        allowed_updates,
        // webhook blocks getUpdates
        delete_webhook = true,
        backoff_min_ms = 1_000,
        backoff_max_ms = 30_000,
      } = options;

      if (delete_webhook) {
        const res = await api("deleteWebhook", {});
        if (!res.ok) {
          throw new Error(
            `tgtb polling: deleteWebhook failed: ${res.description}`,
          );
        }
      }

      running = true;
      let offset: number | undefined;
      let backoff = backoff_min_ms;

      while (running) {
        const res = await api("getUpdates", {
          offset,
          timeout,
          limit,
          allowed_updates,
        });

        if (!res.ok) {
          await sleep(backoff);
          backoff = Math.min(backoff * 2, backoff_max_ms);
          continue;
        }
        backoff = backoff_min_ms;

        for (const update of res.result) {
          // confirmed on next request
          yield update;
          offset = update.update_id + 1;
        }
      }
    },
  };
}
