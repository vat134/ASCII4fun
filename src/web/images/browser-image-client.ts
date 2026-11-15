import { WorkerRequests } from "../browser-engine/worker-requests";
import type { AnimationPlaybackOptions } from "../animations/animation-conversion";
import type {
  CharacterImageOptions,
  ImageConversionResult
} from "./image-conversion";

/** Source-owned worker; disposal cancels startup, decoding and conversion together. */
export class BrowserImageClient {
  private readonly worker: Worker;
  private readonly requests: WorkerRequests<ImageConversionResult | null>;
  private readonly ready: Promise<void>;

  constructor(file?: File) {
    this.worker = new Worker(
      new URL("../browser-engine/conversion-worker.ts", import.meta.url),
      { type: "module" }
    );
    this.requests = new WorkerRequests(this.worker, {
      stopped: "The browser engine stopped. Clear the image and retry.",
      unreadable: "The browser engine returned an unreadable result.",
      busy: "Only one image operation can run at a time.",
      timeout:
        "The browser engine took too long. Retry or choose a smaller image."
    });
    this.ready = file ? this.load(file) : Promise.resolve();
  }

  async convert(
    options: CharacterImageOptions,
    frameIndex = 0,
    playback?: AnimationPlaybackOptions
  ): Promise<ImageConversionResult> {
    await this.ready;
    const result = await this.requests.send({
      id: 1,
      type: "convert",
      options,
      frameIndex,
      playback
    });
    if (!result) throw new Error("The browser engine returned no artwork.");
    return result;
  }

  dispose() {
    this.requests.stop(
      new DOMException("Image processing cancelled.", "AbortError")
    );
  }

  async videoTiming(
    frameCount: number,
    durationMs: number,
    playback: AnimationPlaybackOptions
  ) {
    const result = await this.requests.send({
      id: 2,
      type: "video-timing",
      frameCount,
      durationMs,
      playback
    });
    if (!result?.animation)
      throw new Error("The video timeline is unavailable.");
    return result.animation;
  }

  async videoFrame(
    bytes: Uint8Array<ArrayBuffer>,
    width: number,
    height: number,
    options: CharacterImageOptions
  ) {
    const result = await this.requests.send(
      { id: 3, type: "video-frame", bytes, width, height, options },
      [bytes.buffer]
    );
    if (!result) throw new Error("The video frame is unavailable.");
    return result;
  }

  private async load(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await this.requests.send({ id: 0, type: "load", bytes }, [bytes.buffer]);
  }
}
