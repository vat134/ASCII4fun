import { browserEngineTimeoutMs } from "../browser-engine/browser-engine";
import type {
  CompactArtOptions,
  CompactPreviewResult,
  CompactRequest
} from "./compact-types";

/** One source-owned Worker; termination releases decode, conversion and startup together. */
export class CompactArtClient {
  private readonly worker = new Worker(
    new URL("../browser-engine/conversion-worker.ts", import.meta.url),
    { type: "module" }
  );
  private pending: {
    resolve: (value: CompactPreviewResult | null) => void;
    reject: (error: Error) => void;
  } | null = null;
  private timer: number | undefined;
  private nextId = 0;
  private failure: Error | null = null;
  private readonly ready: Promise<void>;

  constructor(file: File) {
    this.worker.onmessage = ({ data }) => {
      if (data.id !== this.nextId) return;
      window.clearTimeout(this.timer);
      const pending = this.pending;
      this.pending = null;
      if (data.error) pending?.reject(new Error(data.error));
      else pending?.resolve(data.value as CompactPreviewResult | null);
    };
    this.worker.onerror = () =>
      this.stop(
        new Error("The mini-art engine stopped. Clear the photo and retry.")
      );
    this.worker.onmessageerror = () =>
      this.stop(
        new Error("The mini-art engine returned an unreadable result.")
      );
    this.ready = this.load(file);
    // Attach a handler during source loading; convert still observes the original rejection.
    void this.ready.catch(() => {});
  }

  async convert(options: CompactArtOptions): Promise<CompactPreviewResult> {
    await this.ready;
    const result = await this.send({
      id: ++this.nextId,
      type: "convert-compact",
      options
    });
    if (!result) throw new Error("The mini-art engine returned no artwork.");
    return result;
  }

  dispose() {
    this.stop(new DOMException("Mini-art processing cancelled.", "AbortError"));
  }

  private async load(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await this.send({ id: ++this.nextId, type: "load-compact", bytes }, [
      bytes.buffer
    ]);
  }

  private send(
    message: CompactRequest,
    transfer: Transferable[] = []
  ): Promise<CompactPreviewResult | null> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.pending)
      return Promise.reject(
        new Error("Only one mini-art operation can run at a time.")
      );
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.timer = window.setTimeout(
        () =>
          this.stop(
            new Error(
              "Mini-art processing took too long. Retry or choose a smaller photo."
            )
          ),
        browserEngineTimeoutMs
      );
      this.worker.postMessage(message, transfer);
    });
  }

  private stop(error: Error) {
    this.failure = error;
    window.clearTimeout(this.timer);
    this.worker.terminate();
    this.pending?.reject(error);
    this.pending = null;
  }
}
