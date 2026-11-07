import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspace = mkdtempSync(join(tmpdir(), "ascii4fun-package-"));
const version = `0.0.0-smoke.${Date.now()}`;
const consumer = join(workspace, "consumer");
const project = join(consumer, "ascii4fun-package-smoke.csproj");
const feed = join(workspace, "feed");
const published = join(workspace, "published");

function dotnet(...args) {
  const result = spawnSync("dotnet", args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`dotnet ${args[0]} failed with exit code ${result.status}`);
}

try {
  // Restore outside the repository so project references and shared build files cannot hide packaging defects.
  cpSync(join(root, "tests/ascii4fun-package-smoke"), consumer, {
    recursive: true
  });
  dotnet(
    "pack",
    "src/engine/ascii4fun.csproj",
    "-c",
    "Release",
    "-o",
    feed,
    `-p:PackageVersion=${version}`
  );
  dotnet(
    "restore",
    project,
    "--packages",
    join(workspace, "packages"),
    `-p:SmokePackageVersion=${version}`
  );
  dotnet(
    "publish",
    project,
    "-c",
    "Release",
    "--no-restore",
    "-o",
    published,
    `-p:SmokePackageVersion=${version}`
  );
  dotnet(join(published, "Ascii4Fun.PackageSmoke.dll"));
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
