import { BrowserImageClient } from "./browser-image-client";
import {
  type CharacterImageOptions,
  type ImageConversionResult
} from "./image-conversion";
import { ImageResultCache } from "./image-result-cache";
import type { AnimationPlaybackOptions } from "../animations/animation-conversion";
import { imageOptionsKey as optionsKey } from "./image-options-key";
import type { BrowserVideoClient } from "../videos/browser-video-client";

export type ConversionState =
  | { status: "empty" }
  | { status: "pending"; result: ImageConversionResult | null }
  | { status: "ready"; result: ImageConversionResult }
  | { status: "error"; message: string };

type PreviewRequest = {
  key: string;
  options: CharacterImageOptions;
  revision: number;
  frameIndex: number;
  playback: AnimationPlaybackOptions | undefined;
};

export class ImagePreviewSession {
  private readonly cache = new ImageResultCache();
  private latest: PreviewRequest | null = null;
  private active = false;
  private displayed: {
    key: string;
    result: ImageConversionResult;
    revision: number;
  } | null = null;
  private revision = 0;
  private disposed = false;

  constructor(
    file: File,
    private readonly publish: (state: ConversionState) => void,
    private readonly client:
      BrowserImageClient | BrowserVideoClient = new BrowserImageClient(file)
  ) {}
  request(
    options: CharacterImageOptions,
    frameIndex = 0,
    playback?: AnimationPlaybackOptions
  ) {
    if (this.disposed) return;
    const key =
      optionsKey(options) +
      (playback ? JSON.stringify({ frameIndex, playback }) : "");
    const revision = ++this.revision;
    this.latest = {
      key,
      options: { ...options },
      revision,
      frameIndex,
      playback
    };
    const cached = this.cache.get(key);
    const result =
      cached ??
      (this.displayed?.key === key ? this.displayed.result : undefined);
    if (result) {
      this.present(this.latest, result, "ready");
      return;
    }
    if (
      playback &&
      this.displayed?.result.animation &&
      this.displayed.key.startsWith(optionsKey(options))
    )
      this.publish({ status: "ready", result: this.displayed.result });
    else
      this.publish({
        status: "pending",
        result: this.displayed?.result ?? null
      });
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
    this.active = true;
    try {
      while (
        !this.disposed &&
        this.latest &&
        this.latest.key !== this.displayed?.key
      ) {
        const requested: PreviewRequest = this.latest;
        try {
          const result = requested.playback
            ? await this.client.convert(
                requested.options,
                requested.frameIndex,
                requested.playback
              )
            : await this.client.convert(requested.options);
          const latest: PreviewRequest | null = this.latest;
          if (this.disposed || !latest) return;
          this.cache.set(requested.key, result);
          if (latest.key === requested.key) {
            this.present(latest, result, "ready");
          } else if (requested.revision >= (this.displayed?.revision ?? 0)) {
            // A newer cache hit must never be replaced by an older in-flight completion.
            this.present(
              requested,
              result,
              result.animation &&
                optionsKey(requested.options) === optionsKey(latest.options)
                ? "ready"
                : "pending"
            );
          }
        } catch (error) {
          if (!this.disposed && this.latest?.key === requested.key) {
            this.publish({
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Conversion failed. Please retry."
            });
          }
        }
        if (this.disposed || this.latest?.key === requested.key) break;
      }
    } finally {
      this.active = false;
    }
  }
  private present(
    request: PreviewRequest,
    result: ImageConversionResult,
    status: "ready" | "pending"
  ) {
    this.displayed = { key: request.key, result, revision: request.revision };
    this.publish({ status, result });
  }
}
