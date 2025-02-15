import { create_validator } from "../../lib/tg_validator.js";
import type { TgtbConfig } from "../types/interface.ts";

/**
 * @ignore
 * @internal
 * @param bot_token
 * @param config
 * @returns
 */
export default function buildInitDataTools(bot_token: string, config: TgtbConfig) {
  const validate = create_validator(bot_token);

  return {
    isValid: (init_data: string): boolean => {
      try {
        validate(init_data);
        return true;
      } catch {
        return false;
      }
    },
    validate: (init_data: string): true | Error => validate(init_data),
  };
}