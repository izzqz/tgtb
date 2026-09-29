import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import tgtb, { type Client } from "../src/mod.ts";

describe("polling", () => {
  const BOT_TOKEN = "test_token";
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  let client: Client;

  const update = (id: number) => ({ update_id: id, message: { text: "x" } });

  const okUpdates = (updates: object[]) =>
    new Response(JSON.stringify({ ok: true, result: updates }));

  const okTrue = () =>
    new Response(JSON.stringify({ ok: true, result: true }));

  const isDelete = (url: string | URL) =>
    url.toString().endsWith("/deleteWebhook");

  type Call = { url: string; body: object };
  let recordCalls: Call[];

  const recordingFetch =
    (respond: (call: Call, n: number) => Response) =>
    async (input: string | URL, init?: RequestInit) => {
      const call: Call = {
        url: input.toString(),
        body: JSON.parse(init?.body as string),
      };
      const n = recordCalls.push(call);
      return respond(call, n);
    };

  beforeEach(() => {
    recordCalls = [];
    client = tgtb(BOT_TOKEN, {
      fetch_fn: async () => okUpdates([]),
    });
  });

  it("delete the webhook by default, then poll", async () => {
    client = tgtb(BOT_TOKEN, {
      fetch_fn: recordingFetch(({ url }) =>
        isDelete(url) ? okTrue() : okUpdates([update(1)]),
      ),
    });

    const iterator = client.polling.updates();
    const { value } = await iterator.next();
    assert.equal(value!.update_id, 1);
    await iterator.return();

    assert.match(recordCalls[0].url, /\/deleteWebhook$/);
    assert.match(recordCalls[1].url, /\/getUpdates$/);
    assert.deepStrictEqual(recordCalls[1].body, { timeout: 50 });
  });

  it("skip the webhook deletion when disabled", async () => {
    client = tgtb(BOT_TOKEN, {
      fetch_fn: recordingFetch(({ url }) =>
        isDelete(url) ? okTrue() : okUpdates([update(1)]),
      ),
    });

    const iterator = client.polling.updates({ delete_webhook: false });
    const { value } = await iterator.next();
    assert.equal(value!.update_id, 1);
    await iterator.return();

    assert.equal(recordCalls.length, 1);
    assert.match(recordCalls[0].url, /\/getUpdates$/);
  });

  it("throw when deleteWebhook fails", async () => {
    client = tgtb(BOT_TOKEN, {
      fetch_fn: async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error_code: 409,
            description: "conflict",
          }),
        ),
    });

    await assert.rejects(
      () => client.polling.updates().next(),
      /deleteWebhook failed: conflict/,
    );
  });

  it("yield updates and advance the offset across polls", async () => {
    let getUpdatesCalls = 0;
    client = tgtb(BOT_TOKEN, {
      fetch_fn: recordingFetch(({ url }) => {
        if (isDelete(url)) return okTrue();
        getUpdatesCalls += 1;
        return okUpdates(getUpdatesCalls === 1 ? [update(5), update(6)] : [update(9)]);
      }),
    });

    const received: number[] = [];
    for await (const u of client.polling.updates()) {
      received.push(u.update_id);
      if (u.update_id === 9) break;
    }

    assert.deepStrictEqual(received, [5, 6, 9]);
    const polls = recordCalls.filter((c) => !isDelete(c.url));
    assert.deepStrictEqual(polls[0].body, { timeout: 50 });
    assert.deepStrictEqual(polls[1].body, { timeout: 50, offset: 7 });
    assert.equal(polls.length, 2);
  });

  it("not advance the offset until the consumer asks for the next update", async () => {
    client = tgtb(BOT_TOKEN, {
      fetch_fn: recordingFetch(({ url }) =>
        isDelete(url) ? okTrue() : okUpdates([update(1)]),
      ),
    });

    const iterator = client.polling.updates()[Symbol.asyncIterator]();
    await iterator.next();
    await iterator.return();

    const polls = recordCalls.filter((c) => !isDelete(c.url));
    assert.deepStrictEqual(polls, [{ url: polls[0].url, body: { timeout: 50 } }]);
  });

  it("pass timeout, limit and allowed_updates", async () => {
    client = tgtb(BOT_TOKEN, {
      fetch_fn: recordingFetch(({ url }) =>
        isDelete(url) ? okTrue() : okUpdates([update(1)]),
      ),
    });

    const iterator = client.polling.updates({
      delete_webhook: false,
      timeout: 10,
      limit: 1,
      allowed_updates: ["message"],
    });
    const { value } = await iterator.next();
    assert.equal(value!.update_id, 1);
    await iterator.return();

    assert.deepStrictEqual(recordCalls[0].body, {
      timeout: 10,
      limit: 1,
      allowed_updates: ["message"],
    });
  });

  it("back off on an error response and continue", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let getUpdatesCalls = 0;
      client = tgtb(BOT_TOKEN, {
        fetch_fn: recordingFetch(({ url }) => {
          if (isDelete(url)) return okTrue();
          getUpdatesCalls += 1;
          if (getUpdatesCalls === 1) {
            return new Response(
              JSON.stringify({
                ok: false,
                error_code: 502,
                description: "Bad Gateway",
              }),
            );
          }
          return okUpdates([update(1)]);
        }),
      });

      const iterator = client.polling.updates();
      const next = iterator.next();
      await flush();
      mock.timers.tick(1000);
      await flush();
      const { value, done } = await next;
      assert.equal(done, false);
      assert.equal(value!.update_id, 1);
      await iterator.return();

      const polls = recordCalls.filter((c) => !isDelete(c.url));
      assert.equal(polls.length, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("use custom backoff timings", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let getUpdatesCalls = 0;
      client = tgtb(BOT_TOKEN, {
        fetch_fn: recordingFetch(({ url }) => {
          if (isDelete(url)) return okTrue();
          getUpdatesCalls += 1;
          if (getUpdatesCalls <= 2) {
            return new Response(
              JSON.stringify({
                ok: false,
                error_code: 502,
                description: "Bad Gateway",
              }),
            );
          }
          return okUpdates([update(1)]);
        }),
      });

      const waits: number[] = [];
      const iterator = client.polling.updates({
        backoff_min_ms: 100,
        backoff_max_ms: 150,
      });
      const next = iterator.next();
      await flush();
      // first failure waits backoff_min_ms
      mock.timers.tick(100);
      await flush();
      // second failure waits min(200, backoff_max_ms)
      mock.timers.tick(150);
      await flush();
      const { value, done } = await next;
      assert.equal(done, false);
      assert.equal(value!.update_id, 1);
      await iterator.return();

      const polls = recordCalls.filter((c) => !isDelete(c.url));
      assert.equal(polls.length, 3);
    } finally {
      mock.timers.reset();
    }
  });

  it("deliver the in-flight batch and not fetch again after stop", async () => {
    let getUpdatesCalls = 0;
    client = tgtb(BOT_TOKEN, {
      fetch_fn: recordingFetch(({ url }) => {
        if (isDelete(url)) return okTrue();
        getUpdatesCalls += 1;
        return okUpdates(getUpdatesCalls === 1 ? [update(1)] : []);
      }),
    });

    const received: number[] = [];
    const iterator = client.polling.updates();
    for await (const u of iterator) {
      received.push(u.update_id);
      client.polling.stop();
    }

    assert.deepStrictEqual(received, [1]);
    const polls = recordCalls.filter((c) => !isDelete(c.url));
    assert.equal(polls.length, 1);
  });
});
