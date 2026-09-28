import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";

import tgtb, { type Client } from "../src/mod.ts";
import type { ApiError } from "../src/types/telegram.ts";

describe("api", () => {
  const BOT_TOKEN = "test_token";
  const DEFAULT_BASE_URL = "https://api.telegram.org/bot";
  let mockFetch: typeof fetch;
  let client: Client;

  beforeEach(() => {
    mockFetch = async (_input: string | URL | Request) => {
      return new Response(
        JSON.stringify({ ok: true, result: { test: "success" } }),
      );
    };

    client = tgtb(BOT_TOKEN, {
      fetch_fn: mockFetch,
    });
  });

  it("construct correct URL with base parameters", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.getMe();

    assert.deepStrictEqual(
      capturedUrl,
      `${DEFAULT_BASE_URL}${BOT_TOKEN}/getMe`,
    );
  });

  it("handle primitive parameters correctly", async () => {
    let capturedInit: RequestInit | undefined;

    mockFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.sendMessage({
      chat_id: 123456,
      text: "test message",
    });

    assert.deepStrictEqual(capturedInit?.method, "POST");
    assert.deepStrictEqual(
      (capturedInit?.headers as Record<string, string>)["Content-Type"],
      "application/json",
    );
    assert.deepStrictEqual(JSON.parse(capturedInit?.body as string), {
      chat_id: 123456,
      text: "test message",
    });
  });

  it("handle object parameters correctly", async () => {
    let capturedInit: RequestInit | undefined;
    const complexObject = {
      keyboard: [[{ text: "Button 1" }, { text: "Button 2" }]],
      resize_keyboard: true,
    };

    mockFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.sendMessage({
      chat_id: 123456,
      text: "test message",
      reply_markup: complexObject,
    });

    assert.deepStrictEqual(JSON.parse(capturedInit?.body as string), {
      chat_id: 123456,
      text: "test message",
      reply_markup: complexObject,
    });
  });

  it("use custom base URL when provided", async () => {
    let capturedUrl: string | undefined;
    const customBaseUrl = "https://custom.api.telegram.org/bot";

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, {
      fetch_fn: mockFetch,
      base_url: customBaseUrl,
    });
    await client.api.getMe();

    assert.deepStrictEqual(
      capturedUrl,
      `${customBaseUrl}${BOT_TOKEN}/getMe`,
    );
  });

  it("handle successful API responses", async () => {
    const expectedResponse = {
      ok: true as const,
      result: {
        id: 123456789,
        is_bot: true as const,
        first_name: "Test Bot",
        username: "test_bot",
        can_join_groups: true as const,
        can_read_all_group_messages: true as const,
        supports_inline_queries: false as const,
        can_connect_to_business: false as const,
        can_be_edited: false as const,
        is_inline_bot: false as const,
        has_main_web_app: false as const,
      },
    };

    mockFetch = async () => {
      return new Response(JSON.stringify(expectedResponse));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    const response = await client.api.getMe();

    assert.deepStrictEqual(response, expectedResponse);
  });

  it("handle API errors gracefully", async () => {
    mockFetch = async () => {
      return new Response(
        JSON.stringify({
          ok: false,
          error_code: 404,
          description: "Not Found",
        } as ApiError),
      );
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    const response = await client.api.getMe() as ApiError;

    assert.deepStrictEqual(response.ok, false);
    assert.deepStrictEqual(response.error_code, 404);
    assert.deepStrictEqual(response.description, "Not Found");
  });

  it("handle network errors", async () => {
    mockFetch = async () => {
      throw new Error("Network error");
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });

    await assert.rejects(
      async () => {
        await client.api.getMe();
      },
      { message: "Network error" },
    );
  });

  it("handle undefined parameter values", async () => {
    let capturedInit: RequestInit | undefined;

    mockFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.sendMessage({
      chat_id: 123456,
      text: "test message",
      reply_to_message_id: undefined,
    });

    const body = JSON.parse(capturedInit?.body as string);
    assert.deepStrictEqual(Object.hasOwn(body, "reply_to_message_id"), false);
  });

  it("handle null parameter values", async () => {
    let capturedInit: RequestInit | undefined;

    mockFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.sendMessage({
      chat_id: 123456,
      text: "test message",
      reply_to_message_id: null,
    });

    const body = JSON.parse(capturedInit?.body as string);
    assert.deepStrictEqual(Object.hasOwn(body, "reply_to_message_id"), false);
  });

  it("handle falsy parameter values correctly", async () => {
    let capturedInit: RequestInit | undefined;

    mockFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.sendMessage({
      chat_id: 0,
      text: "",
      disable_notification: false,
    });

    assert.deepStrictEqual(JSON.parse(capturedInit?.body as string), {
      chat_id: 0,
      text: "",
      disable_notification: false,
    });
  });

  it("work with no parameters", async () => {
    let capturedInit: RequestInit | undefined;

    mockFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.getMe();

    assert.deepStrictEqual(capturedInit?.method, "POST");
    assert.deepStrictEqual(JSON.parse(capturedInit?.body as string), {});
  });

  it("handle falsy parameter values", async () => {
    let capturedInit: RequestInit | undefined;

    mockFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.sendMessage({
      chat_id: 123456,
      text: "test message",
      disable_notification: false,
    });

    assert.deepStrictEqual(JSON.parse(capturedInit?.body as string), {
      chat_id: 123456,
      text: "test message",
      disable_notification: false,
    });
  });

  it("handle optional parameters", async () => {
    let capturedInit: RequestInit | undefined;

    mockFetch = async (
      _input: string | URL | Request,
      init?: RequestInit,
    ) => {
      capturedInit = init;
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.sendMessage({
      chat_id: 123456,
      text: "test message",
      disable_notification: false,
      protect_content: true,
      message_thread_id: 789,
    });

    assert.deepStrictEqual(JSON.parse(capturedInit?.body as string), {
      chat_id: 123456,
      text: "test message",
      disable_notification: false,
      protect_content: true,
      message_thread_id: 789,
    });
  });

  it("handle complex response types", async () => {
    const complexResponse = {
      ok: true as const,
      result: {
        message_id: 123,
        from: {
          id: 456,
          is_bot: true as const,
          first_name: "Bot",
          username: "test_bot",
          can_join_groups: true as const,
          can_read_all_group_messages: true as const,
          supports_inline_queries: false as const,
          has_main_web_app: false as const,
        },
        chat: {
          id: 789,
          type: "private" as const,
          first_name: "User",
          username: "test_user",
        },
        date: 1234567890,
        text: "Test message",
      },
    };

    mockFetch = async () => {
      return new Response(JSON.stringify(complexResponse));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    const response = await client.api.sendMessage({
      chat_id: 789,
      text: "Test message",
    });

    assert.deepStrictEqual(response, complexResponse);
  });

  it("use test mode URL when configured", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, {
      fetch_fn: mockFetch,
      use_test_mode: true,
    });
    await client.api.getMe();

    assert.deepStrictEqual(
      capturedUrl,
      `${DEFAULT_BASE_URL}${BOT_TOKEN}/test/getMe`,
    );
  });

  it("provide .url property on API methods", () => {
    const client = tgtb(BOT_TOKEN);

    assert.deepStrictEqual(
      client.api.getMe.url,
      `${DEFAULT_BASE_URL}${BOT_TOKEN}/getMe`,
    );

    assert.deepStrictEqual(
      client.api.sendMessage.url,
      `${DEFAULT_BASE_URL}${BOT_TOKEN}/sendMessage`,
    );
  });

  it("provide .url property with test mode", () => {
    const client = tgtb(BOT_TOKEN, { use_test_mode: true });

    assert.deepStrictEqual(
      client.api.getMe.url,
      `${DEFAULT_BASE_URL}${BOT_TOKEN}/test/getMe`,
    );
  });

  it("provide .url property with custom base URL", () => {
    const customBaseUrl = "https://custom.api.telegram.org/bot";

    const client = tgtb(BOT_TOKEN, { base_url: customBaseUrl });

    assert.deepStrictEqual(
      client.api.getMe.url,
      `${customBaseUrl}${BOT_TOKEN}/getMe`,
    );
  });

  it("handle non-JSON response body", async () => {
    mockFetch = async () => {
      return new Response("<html>Server Error</html>", { status: 500 });
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });

    await assert.rejects(
      async () => {
        await client.api.getMe();
      },
    );
  });

  it("call nonexistent method", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.api.nonexistentMethod();

    assert.deepStrictEqual(
      capturedUrl,
      `${DEFAULT_BASE_URL}${BOT_TOKEN}/nonexistentMethod`,
    );
  });
});

describe("api rate limiting", () => {
  const BOT_TOKEN = "test_token";

  // ensure retry timer is scheduled
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it("retry a 429 response and return the next result", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        if (calls === 1) {
          return new Response(
            JSON.stringify({
              ok: false,
              error_code: 429,
              description: "Too Many Requests: retry after 2",
              parameters: { retry_after: 2 },
            }),
          );
        }
        return new Response(JSON.stringify({ ok: true, result: {} }));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(2000);

      assert.deepStrictEqual(await response, { ok: true, result: {} });
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("parse retry_after from the description when parameters are missing", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        if (calls === 1) {
          return new Response(
            JSON.stringify({
              ok: false,
              error_code: 429,
              description: "Too Many Requests: retry after 1",
            }),
          );
        }
        return new Response(JSON.stringify({ ok: true, result: {} }));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(1000);

      assert.deepStrictEqual(await response, { ok: true, result: {} });
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("return the 429 response after exhausting max_retries", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const error = {
        ok: false,
        error_code: 429,
        description: "Too Many Requests: retry after 1",
        parameters: { retry_after: 1 },
      };
      const fetchFn = async () => {
        calls += 1;
        return new Response(JSON.stringify(error));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn, max_retries: 2 });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(1000);
      await flush();
      mock.timers.tick(1000);

      assert.deepStrictEqual(await response, error);
      assert.equal(calls, 3);
    } finally {
      mock.timers.reset();
    }
  });

  it("not retry when max_retries is 0", async () => {
    let calls = 0;
    const error = {
      ok: false,
      error_code: 429,
      description: "Too Many Requests: retry after 1",
      parameters: { retry_after: 1 },
    };
    const fetchFn = async () => {
      calls += 1;
      return new Response(JSON.stringify(error));
    };

    const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn, max_retries: 0 });

    assert.deepStrictEqual(await client.api.getMe(), error);
    assert.equal(calls, 1);
  });

  it("not retry non-429 errors", async () => {
    let calls = 0;
    const error = { ok: false, error_code: 404, description: "Not Found" };
    const fetchFn = async () => {
      calls += 1;
      return new Response(JSON.stringify(error));
    };

    const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn });

    assert.deepStrictEqual(await client.api.getMe(), error);
    assert.equal(calls, 1);
  });

  it("retry a 429 without retry_after using the backoff", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        if (calls <= 2) {
          return new Response(
            JSON.stringify({ ok: false, error_code: 429, description: "Too Many Requests" }),
          );
        }
        return new Response(JSON.stringify({ ok: true, result: {} }));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn, max_retries: 2 });
      const response = client.api.getMe();
      // first retry is immediate
      await flush();
      mock.timers.tick(0);
      // second retry waits 100ms
      await flush();
      mock.timers.tick(100);

      assert.deepStrictEqual(await response, { ok: true, result: {} });
      assert.equal(calls, 3);
    } finally {
      mock.timers.reset();
    }
  });

  it("retry a 5xx error with backoff and return the next result", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        if (calls === 1) {
          return new Response(
            JSON.stringify({ ok: false, error_code: 500, description: "Internal Server Error" }),
          );
        }
        return new Response(JSON.stringify({ ok: true, result: {} }));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(0);

      assert.deepStrictEqual(await response, { ok: true, result: {} });
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("return the 5xx response after exhausting max_retries", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const error = { ok: false, error_code: 502, description: "Bad Gateway" };
      const fetchFn = async () => {
        calls += 1;
        return new Response(JSON.stringify(error));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn, max_retries: 2 });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(0);
      await flush();
      mock.timers.tick(100);
      await flush();
      mock.timers.tick(200);

      assert.deepStrictEqual(await response, error);
      assert.equal(calls, 3);
    } finally {
      mock.timers.reset();
    }
  });

  it("retry a network error and return the next result", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        if (calls === 1) throw new TypeError("fetch failed");
        return new Response(JSON.stringify({ ok: true, result: {} }));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(0);

      assert.deepStrictEqual(await response, { ok: true, result: {} });
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("rethrow the network error after exhausting max_retries", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const error = new TypeError("fetch failed");
      const fetchFn = async () => {
        calls += 1;
        throw error;
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn, max_retries: 1 });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(0);

      await assert.rejects(response, (thrown: unknown) => thrown === error);
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("retry a non-JSON response and return the next result", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        if (calls === 1) {
          return new Response("<html>Bad Gateway</html>", {
            status: 502,
            headers: { "Content-Type": "text/html" },
          });
        }
        return new Response(JSON.stringify({ ok: true, result: {} }));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(0);

      assert.deepStrictEqual(await response, { ok: true, result: {} });
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("throw on a non-JSON response after exhausting max_retries", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        return new Response("<html>Bad Gateway</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        });
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn, max_retries: 1 });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(0);

      await assert.rejects(response, /non-JSON response for getMe/);
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("retry a JSON-null response and return the next result", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        if (calls === 1) {
          return new Response("null", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, result: {} }));
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(0);

      assert.deepStrictEqual(await response, { ok: true, result: {} });
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("throw on a JSON-null response after exhausting max_retries", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        return new Response("null", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const client = tgtb(BOT_TOKEN, { fetch_fn: fetchFn, max_retries: 1 });
      const response = client.api.getMe();
      await flush();
      mock.timers.tick(0);

      await assert.rejects(response, /malformed response for getMe/);
      assert.equal(calls, 2);
    } finally {
      mock.timers.reset();
    }
  });

  it("apply the default max_retries when explicitly undefined", async () => {
    mock.timers.enable({ apis: ["setTimeout"], now: 0 });
    try {
      let calls = 0;
      const fetchFn = async () => {
        calls += 1;
        if (calls <= 3) {
          return new Response(
            JSON.stringify({ ok: false, error_code: 500, description: "oops" }),
          );
        }
        return new Response(JSON.stringify({ ok: true, result: {} }));
      };

      const client = tgtb(BOT_TOKEN, {
        fetch_fn: fetchFn,
        max_retries: undefined,
      });
      const response = client.api.getMe();
      for (const wait of [0, 100, 200]) {
        await flush();
        mock.timers.tick(wait);
      }

      assert.deepStrictEqual(await response, { ok: true, result: {} });
      assert.equal(calls, 4);
    } finally {
      mock.timers.reset();
    }
  });
});
