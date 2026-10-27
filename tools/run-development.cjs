const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { developmentEnvironment } = require("./development-environment.cjs");

const serverUrl = developmentEnvironment.ASCII4FUN_SERVER_URL;
const commands = {
  server: {
    executable: "dotnet",
    args: [
      "run",
      "--project",
      "src/ascii4fun-server/ascii4fun-server.csproj",
      "--no-launch-profile"
    ]
  },
  e2e: {
    executable: process.execPath,
    args: [
      require.resolve("start-server-and-test/src/bin/start.js"),
      "pnpm start",
      serverUrl,
      "pnpm test:e2e:run"
    ]
  }
};

const command = commands[process.argv[2]];
if (!command) {
  throw new Error("Expected a development command: server or e2e.");
}

const result = spawnSync(command.executable, command.args, {
  cwd: resolve(__dirname, ".."),
  stdio: "inherit",
  env: {
    ...process.env,
    ASPNETCORE_URLS: serverUrl,
    ASPNETCORE_ENVIRONMENT: "Development"
  }
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
