import { registerHooks } from "node:module";

const BLOCKED = "@faker-js/faker";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === BLOCKED) {
      throw new Error(`Cannot find package '${BLOCKED}'`);
    }

    return next(specifier, context);
  },
});
