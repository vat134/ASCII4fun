import { BrowserImageClient } from "./browser-image-client";
import {
  type CharacterImageOptions,
  type ImageConversionResult
} from "./image-conversion";
import { ImageResultCache } from "./image-result-cache";

export type ConversionState =
  | { status: "empty" }
  | { status: "pending"; result: ImageConversionResult | null }
  | { status: "ready"; result: ImageConversionResult }
  | { status: "error"; message: string };

type PreviewRequest = {
  key: string;
  options: CharacterImageOptions;
  revision: number;
};

function optionsKey(options: CharacterImageOptions): string {
  return JSON.stringify({
    outputWidthInCells: options.outputWidthInCells,
    style: options.style,
    characterRamp: options.characterRamp,
    invert: options.invert,
    sourceColors: options.sourceColors,
    contrast: options.contrast,
    brightness: options.brightness,
    shadowLift: options.shadowLift,
    sourcePhotoOpacity: options.sourcePhotoOpacity,
    monochromeColor: options.monochromeColor,
    backgroundColor: options.backgroundColor
  } satisfies CharacterImageOptions);
}

/** One source's request lifecycle and completed results, independent of React rendering. */
export class ImagePreviewSession {
  private readonly cache = new ImageResultCache();
  private latest: PreviewRequest | null = null;
  private active = false;
  private readonly client: BrowserImageClient;
  private displayed: {
    key: string;
    result: ImageConversionResult;
    revision: number;
  } | null = null;
  private revision = 0;
  private disposed = false;

  constructor(
    file: File,
    private readonly publish: (state: ConversionState) => void
  ) {
    this.client = new BrowserImageClient(file);
  }

  request(options: CharacterImageOptions) {
    if (this.disposed) return;
    const key = optionsKey(options);
    const revision = ++this.revision;
    this.latest = { key, options: { ...options }, revision };
    const cached = this.cache.get(key);
    const result =
      cached ??
      (this.displayed?.key === key ? this.displayed.result : undefined);
    if (result) {
      this.displayed = { key, result, revision };
      this.publish({ status: "ready", result });
      return;
    }
    this.publish({ status: "pending", result: this.displayed?.result ?? null });
    if (!this.active) void this.convertNext();
  }

  dispose() {
    this.disposed = true;
    this.client.dispose();
    this.cache.clear();
    this.latest = null;
    this.displayed = null;
  }

  private async convertNext() {
    if (
      this.disposed ||
      this.active ||
      !this.latest ||
      this.latest.key === this.displayed?.key
    )
      return;
    this.active = true;
    try {
      while (!this.disposed && this.latest!.key !== this.displayed?.key) {
        const requested = this.latest!;
        try {
          const result = await this.client.convert(requested.options);
          if (this.disposed) return;
          this.cache.set(requested.key, result);
          if (this.latest!.key === requested.key) {
            this.displayed = {
              key: requested.key,
              result,
              revision: this.latest!.revision
            };
            this.publish({ status: "ready", result });
          } else if (requested.revision >= (this.displayed?.revision ?? 0)) {
            // A newer cache hit must never be replaced by an older in-flight completion.
            this.displayed = {
              key: requested.key,
              result,
              revision: requested.revision
            };
            this.publish({ status: "pending", result });
          }
        } catch (error) {
          if (!this.disposed && this.latest!.key === requested.key) {
            this.publish({
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Conversion failed. Please retry."
            });
          }
        }
        if (this.disposed || this.latest!.key === requested.key) break;
      }
    } finally {
      this.active = false;
    }
  }
}
