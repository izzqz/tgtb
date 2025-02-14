import { create_validator } from "../../lib/tg_validator.js";

/**
 * @ignore
 * @internal
 * @param bot_token
 * @returns 
 */
export default function createValidateWebapp(bot_token: string) {
  const validate = create_validator(bot_token);

  return (init_data: string): true | Error => validate(init_data);
}
