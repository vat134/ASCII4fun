import { BrowserImageClient } from "../images/browser-image-client";
import type {
  CharacterImageOptions,
  ImageConversionResult
} from "../images/image-conversion";
import type { AnimationPlaybackOptions } from "../animations/animation-conversion";
import type { VideoMetadata } from "./prepare-video";

/** A paused frame decoder and an independent audio clock, with one shared C# conversion worker. */
export class BrowserVideoClient {
  readonly clock: { current: HTMLAudioElement };
  private readonly decoder = document.createElement("video");
  private readonly client = new BrowserImageClient();
  private readonly canvas = document.createElement("canvas");
  private readonly context: CanvasRenderingContext2D;
  private readonly ready: Promise<void>;
  private animation: ImageConversionResult["animation"];
  private timingKey = "";
  private readonly lifetime = new AbortController();

  constructor(
    url: string,
    private readonly metadata: VideoMetadata
  ) {
    this.clock = { current: new Audio(url) };
    this.clock.current.preload = "auto";
    this.decoder.muted = true;
    this.decoder.preload = "auto";
    this.decoder.playsInline = true;
    this.canvas.width = metadata.widthInPixels;
    this.canvas.height = metadata.heightInPixels;
    const context = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Video frame capture is unavailable.");
    this.context = context;
    this.ready = this.waitFor("loadeddata", () => {
      this.decoder.src = url;
    });
  }

  async convert(
    options: CharacterImageOptions,
    frameIndex = 0,
    playback: AnimationPlaybackOptions = { speed: 1, framesPerSecond: null }
  ) {
    await this.ready;
    this.lifetime.signal.throwIfAborted();
    const key = JSON.stringify(playback);
    if (key !== this.timingKey || !this.animation) {
      this.animation = await this.client.videoTiming(
        this.metadata.frameCount,
        this.metadata.durationMs,
        playback
      );
      this.timingKey = key;
    }
    const index = Math.min(frameIndex, this.animation.timeline.length - 1);
    const sourceIndex = this.animation.timeline[index]!.sourceFrameIndex;
    // Seek inside the requested frame; exact boundaries can resolve to the previous decoded frame.
    const time = Math.min(
      (sourceIndex + 0.1) / this.metadata.framesPerSecond,
      this.metadata.durationMs / 1000 - 0.0001
    );
    if (Math.abs(this.decoder.currentTime - time) > 0.00001)
      await this.waitFor("seeked", () => {
        this.decoder.currentTime = time;
      });
    this.lifetime.signal.throwIfAborted();
    this.context.drawImage(this.decoder, 0, 0);
    const frame = this.context.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const result = await this.client.videoFrame(
      new Uint8Array(frame.data.buffer),
      this.canvas.width,
      this.canvas.height,
      options
    );
    return { ...result, animation: { ...this.animation, frameIndex: index } };
  }

  dispose() {
    this.lifetime.abort();
    this.clock.current.pause();
    this.clock.current.removeAttribute("src");
    this.clock.current.load();
    this.decoder.removeAttribute("src");
    this.decoder.load();
    this.client.dispose();
  }

  private waitFor(event: "loadeddata" | "seeked", action: () => void) {
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        window.clearTimeout(timeout);
        this.decoder.removeEventListener(event, complete);
        this.decoder.removeEventListener("error", fail);
        this.lifetime.signal.removeEventListener("abort", abort);
      };
      const complete = () => {
        cleanup();
        resolve();
      };
      const fail = () => {
        cleanup();
        reject(
          new Error("The prepared video could not be decoded by this browser.")
        );
      };
      const abort = () => {
        cleanup();
        reject(new DOMException("Video processing cancelled.", "AbortError"));
      };
      const timeout = window.setTimeout(fail, 30000);
      this.decoder.addEventListener(event, complete, { once: true });
      this.decoder.addEventListener("error", fail, { once: true });
      this.lifetime.signal.addEventListener("abort", abort, { once: true });
      action();
    });
  }
}
