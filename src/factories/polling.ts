import type {
  PollingOptions,
  PollingTools,
  TgtbConfig,
} from "../types/interface.ts";
import { buildCallMethod, sleep } from "./call_method.ts";

/**
 * getUpdates errors that retrying cannot fix: bad token, bad base_url,
 * bad params. 409 is retried, another poller may be shutting down
 */
const isFatalPollError = (code: number) =>
  code >= 400 && code < 500 && code !== 409 && code !== 429;

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 */
export default function buildPollingTools(
  bot_token: string,
  config: Required<TgtbConfig>,
): PollingTools {
  const api = buildCallMethod(bot_token, config);
  // bumped by stop() and by every new updates() call, so a stale loop exits
  let generation = 0;

  return {
    stop() {
      generation++;
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

      const own = ++generation;
      const running = () => own === generation;
      let offset: number | undefined;
      let confirmed: number | undefined;
      let backoff = backoff_min_ms;

      const failed = async () => {
        await sleep(backoff);
        backoff = Math.min(backoff * 2, backoff_max_ms);
      };

      try {
        while (running()) {
          let res;
          try {
            res = await api("getUpdates", {
              offset,
              timeout,
              limit,
              allowed_updates,
            });
          } catch {
            await failed(); // network outage, keep polling
            continue;
          }

          if (!res.ok) {
            if (isFatalPollError(res.error_code)) {
              throw new Error(
                `tgtb polling: getUpdates failed: ${res.description}`,
              );
            }
            await failed();
            continue;
          }
          backoff = backoff_min_ms;
          confirmed = offset;

          for (const update of res.result) {
            if (!running()) break;
            // confirmed on next request
            yield update;
            offset = update.update_id + 1;
          }
        }
      } finally {
        // no next getUpdates after the loop ends, confirm handled updates now
        if (offset !== confirmed) {
          await api("getUpdates", { offset, limit: 1, timeout: 0 })
            // best effort: unconfirmed updates are redelivered on restart
            .catch(() => {});
        }
      }
    },
  };
}
