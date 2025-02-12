import createValidateWebapp from "../src/factories/validate_webapp.ts";

const validBotToken = '7040088495:AAHVy6LQH-RvZzYi7c5-Yv5w046qPUO2NTk';
const validInitDataString = 'query_id=AAF9tpYRAAAAAH22lhEbSiPx&user=%7B%22id%22%3A295089789%2C%22first_name%22%3A%22Viacheslav%22%2C%22last_name%22%3A%22Melnikov%22%2C%22username%22%3A%22the_real_izzqz%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717087395&hash=7d14c29d52a97f6b71d67c5cb79394675523b53826516f489fb318716389eb7b';
const invalidInitDataString = 'query_id=invalid&user=%7B%22id%22%3A123%7D&auth_date=1717087395&hash=invalid';

const validateWebapp = createValidateWebapp(validBotToken);

Deno.bench("validate valid webapp init data", async () => {
  await validateWebapp(validInitDataString);
});

Deno.bench("validate invalid webapp init data", async () => {
  try {
    await validateWebapp(invalidInitDataString);
  } catch {
    // Expected error
  }
});

Deno.bench("validate empty init data", async () => {
  try {
    await validateWebapp("");
  } catch {
    // Expected error
  }
});

Deno.bench("validate malformed init data", async () => {
  try {
    await validateWebapp("not_a_query_string");
  } catch {
    // Expected error
  }
}); 