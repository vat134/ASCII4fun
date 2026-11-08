import type { BrowserEngine } from "../../browser-engine/browser-engine";
import type { CharacterImageOptions } from "../image-conversion";
import { BrowserGifSource } from "../../animations/browser-gif-source";
import { BrowserImageSource } from "./browser-image-source";
import type {
  AnimationMetadata,
  AnimationPlaybackOptions,
  AnimationFrameTiming
} from "../../animations/animation-conversion";

export class BrowserMediaSource {
  private source: BrowserImageSource | BrowserGifSource | null = null;
  private metadata: AnimationMetadata | null = null;
  private sourceFramesPerSecond = 0;
  constructor(private readonly engine: BrowserEngine) {}

  async load(bytes: Uint8Array) {
    this.source = this.engine.IsGif(bytes)
      ? new BrowserGifSource(this.engine)
      : new BrowserImageSource(this.engine);
    this.metadata = (await this.source.load(bytes)) ?? null;
    if (this.metadata)
      this.sourceFramesPerSecond = this.engine.SourceFramesPerSecond(
        JSON.stringify(this.metadata.frameDurationsMs)
      );
    return null;
  }

  animation(frameIndex: number, playback?: AnimationPlaybackOptions) {
    if (!this.metadata) return undefined;
    const timeline = JSON.parse(
      this.engine.AnimationTiming(
        JSON.stringify(this.metadata.frameDurationsMs),
        playback?.speed ?? 1,
        playback?.framesPerSecond ?? 0
      )
    ) as AnimationFrameTiming[];
    return {
      timeline,
      sourceFramesPerSecond: this.sourceFramesPerSecond,
      iterations: this.metadata.iterations,
      frameIndex: Math.min(frameIndex, timeline.length - 1)
    };
  }

  sample(options: CharacterImageOptions, frameIndex: number) {
    if (!this.source) throw new Error("Load media before converting.");
    return this.source instanceof BrowserGifSource
      ? this.source.sample(options, frameIndex)
      : this.source.sample(
          options.outputWidthInCells,
          options.sourcePhotoOpacity > 0
        );
  }
}
