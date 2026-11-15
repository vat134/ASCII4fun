import { CompactArtClient } from "./compact-client";
import type { CompactArtOptions, CompactPreviewResult } from "./compact-types";

export type CompactPreviewState = {
  status: "idle" | "pending" | "ready" | "error";
  result: CompactPreviewResult | null;
  error: string | null;
};

/** One active conversion and one replaceable intent keep slider work bounded. */
export class CompactPreviewSession {
  private readonly client: CompactArtClient;
  private latest: CompactArtOptions | null = null;
  private busy = false;
  private disposed = false;

  constructor(
    file: File,
    private readonly publish: (state: CompactPreviewState) => void
  ) {
    this.client = new CompactArtClient(file);
  }

  request(options: CompactArtOptions) {
    this.latest = options;
    if (!this.busy) void this.convert();
  }

  private async convert() {
    const options = this.latest;
    if (!options || this.disposed) return;
    this.busy = true;
    try {
      const result = await this.client.convert(options);
      if (!this.disposed && this.latest === options) {
        this.publish({ status: "ready", result, error: null });
      }
    } catch (failure) {
      if (!this.disposed && this.latest === options) {
        this.publish({
          status: "error",
          result: null,
          error:
            failure instanceof Error
              ? failure.message
              : "Cannot convert this image. Retry or choose another file."
        });
      }
    } finally {
      this.busy = false;
      if (!this.disposed && this.latest !== options) void this.convert();
    }
  }

  dispose() {
    this.disposed = true;
    this.client.dispose();
  }
}
