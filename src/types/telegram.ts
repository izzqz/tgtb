/**
 * Types for Telegram API, Login Widget, WebApp
 * Also exported from `@grammyjs/types` and `telegram-webapps`
 * @module
 */

export type * from "../../lib/grammy-types/mod.ts";
export type * from "../../lib/webapp-types/src/index.d.ts";

/**
 * User from [Telegram Login Widget](https://core.telegram.org/widgets/login)
 */
export interface TelegramOAuthUser {
  /** Unique user identifier */
  id: number;
  /** User's first name */
  first_name: string;
  /** User's last name */
  last_name?: string;
  /** User's username */
  username?: string;
  /** URL of the user's profile photo */
  photo_url?: string;
  /** Unix time when the form was opened */
  auth_date: number;
  /** A hash of all passed parameters */
  hash: string;
}
