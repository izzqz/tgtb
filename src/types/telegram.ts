/**
 * Types for Telegram API
 * @module
 */

export type * from "https://raw.githubusercontent.com/grammyjs/types/refs/tags/v3.19.0/mod.ts";
export type * from "https://raw.githubusercontent.com/DavisDmitry/telegram-webapps/refs/tags/8.0.4/src/index.d.ts";

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
