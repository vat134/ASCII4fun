import type { WorkerRequest } from "./browser-engine";
import { BrowserImageSource } from "./browser-image-source";
import { loadBrowserEngine } from "./load-browser-engine";
import { loadFonts } from "./magick-glyph-renderer";

const ready = loadBrowserEngine()
  .catch((cause: unknown) => {
    throw new Error(
      "The browser engine could not start. Check the connection and retry.",
      { cause }
    );
  })
  .then((engine) => ({
    engine,
    source: new BrowserImageSource(engine)
  }));

// Leave onmessage unset: .NET uses it to distinguish a standalone worker from a pthread host.
self.addEventListener(
  "message",
  async ({ data }: MessageEvent<WorkerRequest>) => {
    try {
      const { engine, source } = await ready;
      if (data.type === "load") {
        await source.load(data.bytes);
        self.postMessage({ id: data.id, value: null });
        return;
      }
      await loadFonts(engine.FontNames(data.options.characterRamp));
      const sampled = source.sample(data.options.outputWidthInCells);
      const result = JSON.parse(
        engine.Convert(
          sampled.rgba,
          data.options.outputWidthInCells,
          sampled.height,
          JSON.stringify(data.options)
        )
      );
      const rgb = engine.Rasterize();
      const pixels = new Uint8ClampedArray(
        sampled.widthInPixels * sampled.heightInPixels * 4
      );
      for (
        let input = 0, output = 0;
        input < rgb.length;
        input += 3, output += 4
      ) {
        pixels[output] = rgb[input]!;
        pixels[output + 1] = rgb[input + 1]!;
        pixels[output + 2] = rgb[input + 2]!;
        pixels[output + 3] = 255;
      }
      self.postMessage(
        {
          id: data.id,
          value: {
            ...result,
            pixels,
            widthInPixels: sampled.widthInPixels,
            heightInPixels: sampled.heightInPixels
          }
        },
        { transfer: [pixels.buffer] }
      );
    } catch (error) {
      self.postMessage({
        id: data.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
);
