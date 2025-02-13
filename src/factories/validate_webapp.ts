import { create_validator } from "../../lib/tg_validator.js";

export default function createValidateWebapp(bot_token: string) {
  const validator = create_validator(bot_token);

  return (init_data: string) => validator(init_data);
}