const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { test } = require("node:test");
const {
  developmentEnvironmentSchema
} = require("./development-environment.cjs");

test("omitted settings use the shared development defaults", () => {
  assert.deepEqual(developmentEnvironmentSchema.parse({}), {
    ASCII4FUN_WEB_PORT: 1234,
    ASCII4FUN_SERVER_URL: "http://127.0.0.1:5100"
  });
});

test("shell strings become a port and a normalized server origin", () => {
  assert.deepEqual(
    developmentEnvironmentSchema.parse({
      ASCII4FUN_WEB_PORT: "2345",
      ASCII4FUN_SERVER_URL: "http://localhost:5200/"
    }),
    { ASCII4FUN_WEB_PORT: 2345, ASCII4FUN_SERVER_URL: "http://localhost:5200" }
  );
});

test("invalid ports and non-origin server URLs fail validation", () => {
  for (const port of ["", "0", "65536", "1.5", "abc"]) {
    assert.equal(
      developmentEnvironmentSchema.safeParse({ ASCII4FUN_WEB_PORT: port })
        .success,
      false,
      port
    );
  }
  for (const url of [
    "invalid",
    "ftp://localhost:5200",
    "http://localhost:0",
    "http://localhost:5200/api",
    "http://localhost:5200?mode=test",
    "http://localhost:5200#fragment",
    "http://user:password@localhost:5200"
  ]) {
    assert.equal(
      developmentEnvironmentSchema.safeParse({ ASCII4FUN_SERVER_URL: url })
        .success,
      false,
      url
    );
  }
});

test("root .env.local loads from another cwd and shell overrides win", (t) => {
  const fixture = mkdtempSync(join(tmpdir(), "ascii4fun-environment-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  mkdirSync(join(fixture, "tools"));
  const configuration = join(fixture, "tools/development-environment.cjs");
  copyFileSync(
    resolve(__dirname, "development-environment.cjs"),
    configuration
  );
  writeFileSync(
    join(fixture, ".env.local"),
    "ASCII4FUN_WEB_PORT=2345\nASCII4FUN_SERVER_URL=http://127.0.0.1:5200\n"
  );

  const env = {
    ...process.env,
    NODE_PATH: resolve(__dirname, "../node_modules")
  };
  delete env.ASCII4FUN_WEB_PORT;
  delete env.ASCII4FUN_SERVER_URL;
  for (const shellPort of [undefined, "3456"]) {
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        "console.log(JSON.stringify(require(process.argv[1]).developmentEnvironment))",
        configuration
      ],
      {
        cwd: tmpdir(),
        encoding: "utf8",
        env: shellPort ? { ...env, ASCII4FUN_WEB_PORT: shellPort } : env
      }
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      ASCII4FUN_WEB_PORT: shellPort ? Number(shellPort) : 2345,
      ASCII4FUN_SERVER_URL: "http://127.0.0.1:5200"
    });
  }
});

test("invalid configuration stops server and E2E launchers before startup", () => {
  for (const command of ["server", "e2e"]) {
    const result = spawnSync(
      process.execPath,
      [resolve(__dirname, "run-development.cjs"), command],
      {
        encoding: "utf8",
        env: { ...process.env, ASCII4FUN_WEB_PORT: "invalid" }
      }
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ASCII4FUN_WEB_PORT/);
    assert.equal(result.stdout, "");
  }
});
