import magickWasmUrl from "url:@imagemagick/magick-wasm/magick.wasm";
import {
  initializeImageMagick,
  ResourceLimits
} from "@imagemagick/magick-wasm";
import type { BrowserEngine } from "./browser-engine";
import { renderMask } from "./magick-glyph-renderer";

export async function loadBrowserEngine(): Promise<BrowserEngine> {
  const runtimeUrl = new URL("/engine-runtime/dotnet.js", self.location.origin)
    .href;
  const { dotnet } = await import(runtimeUrl);
  const runtime = await dotnet.create();
  runtime.setModuleImports("image-media", { renderMask });
  const exports = await runtime.getAssemblyExports(
    runtime.getConfig().mainAssemblyName
  );
  await initializeImageMagick(new URL(magickWasmUrl, self.location.href));
  const engine: BrowserEngine =
    exports.Ascii4Fun.Browser.BrowserConversionEngine;
  const [, , maxDimension] = engine.Limits();
  // Original plus resize/color-profile buffers must fit without disk spill.
  ResourceLimits.memory = BigInt(256 * 1024 * 1024);
  ResourceLimits.disk = 0n;
  ResourceLimits.width = BigInt(maxDimension!);
  ResourceLimits.height = BigInt(maxDimension!);
  ResourceLimits.listLength = 2n;
  return engine;
}
