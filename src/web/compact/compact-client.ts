import { WorkerRequests } from "../browser-engine/worker-requests";
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
  private readonly requests: WorkerRequests<
    CompactPreviewResult | null,
    CompactRequest
  >;
  private nextId = 0;
  private readonly ready: Promise<void>;

  constructor(file: File) {
    this.requests = new WorkerRequests(
      this.worker,
      {
        stopped: "The mini-art engine stopped. Clear the photo and retry.",
        unreadable: "The mini-art engine returned an unreadable result.",
        busy: "Only one mini-art operation can run at a time.",
        timeout:
          "Mini-art processing took too long. Retry or choose a smaller photo."
      },
      (id) => id === this.nextId
    );
    this.ready = this.load(file);
    // Attach a handler during source loading; convert still observes the original rejection.
    void this.ready.catch(() => {});
  }

  async convert(options: CompactArtOptions): Promise<CompactPreviewResult> {
    await this.ready;
    const result = await this.requests.send({
      id: ++this.nextId,
      type: "convert-compact",
      options
    });
    if (!result) throw new Error("The mini-art engine returned no artwork.");
    return result;
  }

  dispose() {
    this.requests.stop(
      new DOMException("Mini-art processing cancelled.", "AbortError")
    );
  }

  private async load(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await this.requests.send(
      { id: ++this.nextId, type: "load-compact", bytes },
      [bytes.buffer]
    );
  }
}
