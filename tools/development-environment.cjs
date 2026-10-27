const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { loadEnvFile } = require("node:process");
const { z } = require("zod");

const developmentEnvironmentSchema = z.object({
  ASCII4FUN_WEB_PORT: z.coerce.number().int().min(1).max(65535).default(1234),
  ASCII4FUN_SERVER_URL: z
    .url({ protocol: /^https?$/ })
    .transform((value) => new URL(value))
    .refine(
      (url) =>
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password &&
        url.port !== "0",
      "Use a server origin without credentials, path, query, fragment or port 0."
    )
    .transform((url) => url.origin)
    .default("http://127.0.0.1:5100")
});

const localEnvironmentPath = resolve(__dirname, "../.env.local");
if (existsSync(localEnvironmentPath)) {
  loadEnvFile(localEnvironmentPath);
}

const developmentEnvironment = developmentEnvironmentSchema.parse(process.env);

module.exports = { developmentEnvironmentSchema, developmentEnvironment };
