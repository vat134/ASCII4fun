import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";
import { format, resolveConfig } from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv[2] === "--check";
if (process.argv.length > (check ? 3 : 2))
  throw new Error("Usage: node tools/generate-http-contracts.mjs [--check]");
const workspace = await mkdtemp(join(tmpdir(), "ascii4fun-http-"));
if (!workspace.startsWith(resolve(tmpdir()) + sep))
  throw new Error(
    "Contract workspace must remain inside the temporary directory."
  );

try {
  const result = spawnSync(
    "dotnet",
    [
      "build",
      "--no-incremental",
      "src/server/ascii4fun-server.csproj",
      "--configuration",
      "Release",
      "--artifacts-path",
      join(root, "artifacts/http-contracts/generation"),
      `-p:OpenApiDocumentsDirectory=${workspace}`,
      "-p:OpenApiGenerateDocumentsOnBuild=true",
      "--verbosity",
      "quiet"
    ],
    { cwd: root, stdio: "inherit" }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("HTTP schema generation failed.");
  const schemaPath = join(workspace, "ascii4fun-server.json");
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const declarations = astToString(
    await openapiTS(schema, { defaultNonNullable: false })
  );
  const outputs = [
    ["contracts/http/openapi.json", JSON.stringify(schema)],
    ["src/web/api/generated/http-api.d.ts", declarations]
  ];
  const stale = [];
  for (const [relative, source] of outputs) {
    const target = join(root, relative);
    const content = await format(source, {
      ...(await resolveConfig(target)),
      filepath: target
    });
    if (check) {
      const existing = await readFile(target, "utf8").catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (existing !== content) stale.push(relative);
    } else {
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    }
  }
  if (stale.length)
    throw new Error(
      `Stale HTTP contracts: ${stale.join(", ")}. Run pnpm generate:http-contracts.`
    );
  console.log(
    check ? "HTTP contracts are current." : "HTTP contracts generated."
  );
} finally {
  await rm(workspace, { recursive: true, force: true });
}
