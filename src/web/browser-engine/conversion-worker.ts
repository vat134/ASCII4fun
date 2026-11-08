import { loadBrowserEngine } from "./load-browser-engine";
import type { WorkerRequest } from "./browser-engine";
import type { TextRequest } from "../figlet/text-conversion";
import { renderTextRequest } from "../figlet/worker/text-worker";
import { renderImageRequest } from "../images/worker/image-worker";
import { BrowserImageSource } from "../images/worker/browser-image-source";

const ready = loadBrowserEngine()
  .catch((cause: unknown) => {
    throw new Error(
      "The browser engine could not start. Check the connection and retry.",
      { cause }
    );
  })
  .then((engine) => ({ engine, source: new BrowserImageSource(engine) }));
// One entry point keeps the shared runtime intact in production worker bundles.
// Leave onmessage unset: .NET uses it to identify standalone workers.
self.addEventListener(
  "message",
  async ({ data }: MessageEvent<WorkerRequest | TextRequest>) => {
    try {
      const { engine, source } = await ready;
      if (
        data.type === "fonts" ||
        data.type === "font-preview" ||
        data.type === "font-palette" ||
        data.type === "convert-text"
      )
        await renderTextRequest(engine, data);
      else await renderImageRequest(engine, source, data);
    } catch (error) {
      self.postMessage({
        id: data.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
);
