import {
  ImageMagick,
  MagickImageCollection,
  MagickReadSettings,
  ResourceLimits,
  type IMagickImageCollection
} from "@imagemagick/magick-wasm";
import type { BrowserEngine } from "../browser-engine/browser-engine";
import type { CharacterImageOptions } from "../images/image-conversion";
import { normalizeMagickImage } from "../images/worker/normalize-magick-image";
import { sampleRgbaImage } from "../images/worker/sample-rgba-image";
import { maxRasterDimensionInPixels } from "../rendering/raster-limits";

export class BrowserGifSource {
  private frames: IMagickImageCollection | null = null;
  private rangeWidthInCells = 0;

  constructor(private readonly engine: BrowserEngine) {}

  async load(bytes: Uint8Array) {
    this.engine.ValidateSource(bytes);
    ResourceLimits.listLength = 301n;
    const metadata = MagickImageCollection.create();
    try {
      const settings = new MagickReadSettings();
      settings.frameCount = 301;
      metadata.ping(bytes, settings);
      const first = metadata[0];
      if (!first) throw new Error("GIF contains no frames.");
      const width = first.page.width;
      const height = first.page.height;
      this.engine.ValidateAnimationSource(width, height, metadata.length);
      if (width * height * metadata.length * 32 > 768 * 1024 * 1024)
        throw new Error(
          "GIF exceeds the browser decoded-frame budget. Choose a smaller GIF."
        );
      for (const frame of metadata)
        if (
          frame.page.x < 0 ||
          frame.page.y < 0 ||
          frame.page.x + frame.width > width ||
          frame.page.y + frame.height > height
        )
          throw new Error("GIF frame falls outside its logical canvas.");
    } finally {
      metadata.dispose();
    }
    return new Promise<{ frameDurationsMs: number[]; iterations: number }>(
      (resolve, reject) => {
        ImageMagick.readCollection(bytes, async (frames) => {
          frames.coalesce();
          for (const frame of frames) normalizeMagickImage(frame, this.engine);
          this.frames = frames;
          resolve({
            frameDurationsMs: Array.from(frames, (frame) =>
              Math.round(
                (frame.animationDelay * 1000) /
                  Math.max(1, frame.animationTicksPerSecond)
              )
            ),
            iterations: frames[0]!.animationIterations
          });
          // Source-owned Worker termination releases this native lifetime.
          await new Promise<void>(() => {});
        }).catch(reject);
      }
    );
  }

  sample(options: CharacterImageOptions, frameIndex: number) {
    const frames = this.frames;
    if (!frames || !Number.isInteger(frameIndex) || !frames[frameIndex])
      throw new Error("Choose an available GIF frame.");
    const columns = options.outputWidthInCells;
    const height = this.engine.Height(
      frames[0]!.width,
      frames[0]!.height,
      columns
    );
    const [cellWidth, cellHeight] = this.engine.Geometry();
    const widthInPixels = columns * cellWidth,
      heightInPixels = height * cellHeight;
    if (
      Math.max(widthInPixels, heightInPixels) > maxRasterDimensionInPixels ||
      frames[0]!.width * frames[0]!.height * frames.length * 32 +
        widthInPixels * heightInPixels * 27 +
        columns * height * 64 >
        768 * 1024 * 1024
    )
      throw new Error(
        "GIF exceeds the browser working-buffer budget. Choose fewer columns or a smaller GIF."
      );
    if (options.sourcePhotoOpacity > 0)
      this.engine.PhotoByteLength(columns, height);
    if (this.rangeWidthInCells !== columns) {
      let minimum = 1,
        maximum = 0;
      for (const frame of frames) {
        const rgba = sampleRgbaImage(frame, columns, height);
        const range = this.engine.AnalyzeAnimationFrame(rgba, columns, height);
        minimum = Math.min(minimum, range[0]);
        maximum = Math.max(maximum, range[1]);
      }
      this.engine.SetAnimationRange(minimum, maximum);
      this.rangeWidthInCells = columns;
    }
    const frame = frames[frameIndex]!;
    return {
      rgba: sampleRgbaImage(frame, columns, height),
      sourcePhotoRgba:
        options.sourcePhotoOpacity > 0
          ? sampleRgbaImage(frame, widthInPixels, heightInPixels)
          : new Uint8Array(),
      height,
      widthInPixels,
      heightInPixels
    };
  }
}
