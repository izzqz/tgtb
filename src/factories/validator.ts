/**
 * Throw when `hash_expiration` is set and `auth_date` is missing or too old
 *
 * @ignore
 * @internal
 */
export function assertFresh(
  auth_date: unknown,
  hash_expiration: number | null,
): void {
  if (!hash_expiration) return;

  const date = Number(auth_date);
  if (!date) throw new Error("no auth_date");
  if (Math.floor(Date.now() / 1000) - date >= hash_expiration) {
    throw new Error("hash expired");
  }
}

/**
 * Pair a throwing validator with its boolean twin
 *
 * @ignore
 * @internal
 */
export function validationTools<T>(validate: (data: T) => Promise<void>): {
  isValid: (data: T) => Promise<boolean>;
  validate: (data: T) => Promise<void>;
} {
  return {
    isValid: (data) => validate(data).then(() => true, () => false),
    validate,
  };
}
