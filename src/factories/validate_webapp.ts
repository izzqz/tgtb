import type { TgtbConfig } from "../types/interface.ts";

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 * @returns
 */
export default function buildInitDataTools(
  bot_token: string,
  { hash_expiration }: TgtbConfig,
) {
  const validate = createInitDataValidator(bot_token, hash_expiration);

  return {
    isValid: async (init_data: string): Promise<boolean> => {
      try {
        await validate(init_data);
        return true;
      } catch {
        return false;
      }
    },
    validate: async (init_data: string): Promise<void> => {
      return await validate(init_data);
    },
  };
}

function createInitDataValidator(
  bot_token: string,
  hash_expiration: number | null | undefined,
) {
  type InitDataLike = {
    auth_date: number;
    hash: string;
    [key: string]: unknown;
  };

  const encode = TextEncoder.prototype.encode.bind(new TextEncoder());

  const WEB_APP_UINT8 = new Uint8Array([
    87,
    101,
    98,
    65,
    112,
    112,
    68,
    97,
    116,
    97,
  ]);

  const importKey = (buffer: BufferSource) =>
    crypto.subtle.importKey(
      "raw",
      buffer,
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["sign"],
    );

  const sign = (key: CryptoKey, data: BufferSource) =>
    crypto.subtle.sign(
      "HMAC",
      key,
      data,
    );

  const secret = Promise.resolve()
    .then(() => importKey(WEB_APP_UINT8))
    .then((key) => sign(key, bot_token_e));

  const bot_token_e = encode(bot_token);

  const extractEntries = (
    init_data: string,
  ) => [...new Set(new URLSearchParams(init_data).keys())];

  const prepareData = (init_data: string) => {
    const data = Object.fromEntries(
      new URLSearchParams(init_data),
    ) as InitDataLike;

    const data_check_string = extractEntries(init_data)
      .filter((key) => key !== "hash")
      .map((key) => `${key}=${data[key]}`)
      .sort()
      .join("\n");

    return {
      data_check_string,
      hash: data.hash,
      auth_date: data.auth_date,
    };
  };

  return async (init_data: string): Promise<void> => {
    if (!init_data) throw new Error("init_data is nullish");

    const { data_check_string, hash, auth_date } = prepareData(init_data);

    const signature = await Promise.resolve()
      .then(async () => importKey(await secret))
      .then((key) => sign(key, encode(data_check_string)));

    const computed_hash = [...new Uint8Array(signature)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hash !== computed_hash) {
      throw new Error("hash mismatch");
    }

    if (
      hash_expiration &&
      Date.now() - auth_date * 1000 >= hash_expiration
    ) {
      throw new Error("hash expired");
    }
  };
}
