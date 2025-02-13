// deno-lint-ignore-file require-await
import { assertEquals, assertRejects } from "jsr:@std/assert";
import { beforeEach, describe, it } from "jsr:@std/testing/bdd";

import tgtb from "@izzqz/tgtb";
import type { ApiError } from "@izzqz/tgtb/types";

describe("callMethod", () => {
  const BOT_TOKEN = "test_token";
  const DEFAULT_BASE_URL = "https://api.telegram.org/bot";
  let mockFetch: typeof fetch;
  let client: ReturnType<typeof tgtb>;

  beforeEach(() => {
    // Reset mock for each test
    mockFetch = async (_input: string | URL | Request) => {
      return new Response(
        JSON.stringify({ ok: true, result: { test: "success" } }),
      );
    };

    client = tgtb(BOT_TOKEN, {
      fetch_fn: mockFetch,
    });
  });

  it("should construct correct URL with base parameters", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.callMethod("getMe");

    assertEquals(
      capturedUrl,
      `${DEFAULT_BASE_URL}${BOT_TOKEN}/getMe`,
    );
  });

  it("should handle primitive parameters correctly", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.callMethod("sendMessage", {
      chat_id: 123456,
      text: "test message",
    });

    const url = new URL(capturedUrl!);
    assertEquals(url.searchParams.get("chat_id"), "123456");
    assertEquals(url.searchParams.get("text"), "test message");
  });

  it("should handle object parameters correctly", async () => {
    let capturedUrl: string | undefined;
    const complexObject = {
      keyboard: [[{ text: "Button 1" }, { text: "Button 2" }]],
      resize_keyboard: true,
    };

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.callMethod("sendMessage", {
      chat_id: 123456,
      text: "test message",
      reply_markup: complexObject,
    });

    const url = new URL(capturedUrl!);
    assertEquals(
      url.searchParams.get("reply_markup"),
      JSON.stringify(complexObject),
    );
  });

  it("should use custom base URL when provided", async () => {
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
    await client.callMethod("getMe");

    assertEquals(
      capturedUrl,
      `${customBaseUrl}${BOT_TOKEN}/getMe`,
    );
  });

  it("should handle successful API responses", async () => {
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
    const response = await client.callMethod("getMe");

    assertEquals(response, expectedResponse);
  });

  it("should handle API errors gracefully", async () => {
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
    const response = await client.callMethod("getMe") as ApiError;

    assertEquals(response.ok, false);
    assertEquals(response.error_code, 404);
    assertEquals(response.description, "Not Found");
  });

  it("should handle network errors", async () => {
    mockFetch = async () => {
      throw new Error("Network error");
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });

    await assertRejects(
      async () => {
        await client.callMethod("getMe");
      },
      Error,
      "Network error",
    );
  });

  it("should handle undefined parameter values", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.callMethod("sendMessage", {
      chat_id: 123456,
      text: "test message",
      reply_to_message_id: undefined,
    });

    const url = new URL(capturedUrl!);
    assertEquals(url.searchParams.get("reply_to_message_id"), "undefined");
  });

  it("should work with no parameters", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.callMethod("getMe");

    const url = new URL(capturedUrl!);
    assertEquals(Array.from(url.searchParams.entries()).length, 0);
  });

  it("should handle falsy parameter values", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.callMethod("sendMessage", {
      chat_id: 123456,
      text: "test message",
      disable_notification: false,
    });

    const url = new URL(capturedUrl!);
    assertEquals(url.searchParams.get("disable_notification"), "false");
  });

  it("should handle optional parameters", async () => {
    let capturedUrl: string | undefined;

    mockFetch = async (input: string | URL | Request) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ ok: true, result: {} }));
    };

    client = tgtb(BOT_TOKEN, { fetch_fn: mockFetch });
    await client.callMethod("sendMessage", {
      chat_id: 123456,
      text: "test message",
      disable_notification: false,
      protect_content: true,
      message_thread_id: 789,
    });

    const url = new URL(capturedUrl!);
    assertEquals(url.searchParams.get("disable_notification"), "false");
    assertEquals(url.searchParams.get("protect_content"), "true");
    assertEquals(url.searchParams.get("message_thread_id"), "789");
  });

  it("should handle complex response types", async () => {
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
    const response = await client.callMethod("sendMessage", {
      chat_id: 789,
      text: "Test message",
    });

    assertEquals(response, complexResponse);
  });
});
