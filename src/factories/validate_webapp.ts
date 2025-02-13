import { create_validator } from "../../lib/tg_validator.js";

export default function createValidateWebapp(bot_token: string) {
  const validator = create_validator(bot_token);

  return async (init_data: string): Promise<boolean> => {
    try {
      const result = await validator(init_data);
      return result === true;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };
}