import { create_validator } from "../../lib/tg_validator.js";

export default function createValidateWebapp(bot_token: string) {
  const validator = create_validator(bot_token);

  return (init_data: string): boolean => {
    try {
      const result = validator(init_data);
      if (!result) {
        throw new Error("hash mismatch");
      }
      return true;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };
}