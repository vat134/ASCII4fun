import { spawnSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("artifacts/browser-engine/", root);
const destination = new URL("src/server/wwwroot/engine-runtime/", root);
async function clearOwnedDirectory(target, expectedRelativePath) {
  if (
    relative(fileURLToPath(root), fileURLToPath(target))
      .split(/[/\\]/u)
      .join("/") !== expectedRelativePath
  )
    throw new Error(
      "Refusing to clear a directory outside the browser engine output."
    );
  await rm(target, { recursive: true, force: true });
}
if (process.argv[2] !== "copy") {
  await clearOwnedDirectory(output, "artifacts/browser-engine");
  const result = spawnSync(
    "dotnet",
    [
      "publish",
      "src/engine/browser/ascii4fun-browser.csproj",
      "-c",
      "Release",
      "-o",
      fileURLToPath(output),
      "--nologo"
    ],
    { cwd: fileURLToPath(root), stdio: "inherit" }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
await clearOwnedDirectory(destination, "src/server/wwwroot/engine-runtime");
await mkdir(destination, { recursive: true });
await cp(new URL("wwwroot/_framework/", output), destination, {
  recursive: true
});
await cp(
  new URL("src/engine/rendering/fonts/", root),
  new URL("fonts/", destination),
  { recursive: true }
);
await cp(new URL("notices/", output), new URL("notices/", destination), {
  recursive: true
});
await cp(
  new URL("node_modules/@imagemagick/magick-wasm/NOTICE", root),
  new URL("notices/magick-wasm-notices.txt", destination)
);
await cp(
  new URL("node_modules/@imagemagick/magick-wasm/LICENSE", root),
  new URL("notices/magick-wasm-license.txt", destination)
);
