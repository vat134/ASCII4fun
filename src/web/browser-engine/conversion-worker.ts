import { loadBrowserEngine } from "./load-browser-engine";
import type { WorkerRequest } from "./browser-engine";
import type { TextRequest } from "../figlet/text-conversion";
import { renderTextRequest } from "../figlet/worker/text-worker";
import { renderImageRequest } from "../images/worker/image-worker";
import { BrowserMediaSource } from "../images/worker/browser-media-source";
import { renderVideoFrame } from "../videos/video-frame-worker";
import type { CompactRequest } from "../compact/compact-types";
import { renderCompactRequest } from "../compact/compact-worker";
import { BrowserImageSource } from "../images/worker/browser-image-source";

const ready = loadBrowserEngine()
  .catch((cause: unknown) => {
    throw new Error(
      "The browser engine could not start. Check the connection and retry.",
      { cause }
    );
  })
  .then((engine) => ({
    engine,
    source: new BrowserMediaSource(engine),
    compact: new BrowserImageSource(engine)
  }));
// One entry point keeps the shared runtime intact in production worker bundles.
// Leave onmessage unset: .NET uses it to identify standalone workers.
self.addEventListener(
  "message",
  async ({
    data
  }: MessageEvent<WorkerRequest | TextRequest | CompactRequest>) => {
    try {
      const { engine, source, compact } = await ready;
      if (data.type === "load-compact" || data.type === "convert-compact") {
        await renderCompactRequest(engine, compact, data);
        return;
      }
      if (data.type === "video-frame") {
        await renderVideoFrame(engine, data);
        return;
      }
      if (data.type === "video-timing") {
        self.postMessage({
          id: data.id,
          value: {
            animation: {
              timeline: JSON.parse(
                engine.VideoTiming(
                  data.frameCount,
                  data.durationMs,
                  data.playback.speed,
                  data.playback.framesPerSecond ?? 0
                )
              ),
              sourceFramesPerSecond: (data.frameCount * 1000) / data.durationMs,
              iterations: 1,
              frameIndex: 0
            }
          }
        });
        return;
      }
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
