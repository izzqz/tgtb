export const importHMAC = async (buffer: BufferSource) =>
  await crypto.subtle.importKey(
    "raw",
    buffer,
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );

export const signHMAC = async (key: CryptoKey, data: BufferSource) =>
  await crypto.subtle.sign(
    "HMAC",
    key,
    data,
  );

export const createDataCheckString = (
  entries: Iterable<[string, unknown]>,
) => {
  return [...entries]
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
};

/**
 * Text encoder
 * @ignore
 * @internal
 */
export const encode = TextEncoder.prototype.encode.bind(new TextEncoder());
