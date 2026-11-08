import type { BrowserTextClient } from "./browser-text-client";
import type { AsciiPreviewResult } from "../rendering/ascii-preview-result";

/** Pending visible-card work; the session runs one card only after active edits. */
export class TextFontPreviews {
  private readonly pending = new Set<string>();
  private readonly requested = new Set<string>();

  constructor(
    private readonly onThumbnail: (
      id: string,
      preview: AsciiPreviewResult | null,
      error?: string
    ) => void
  ) {}

  get hasPending() {
    return this.pending.size > 0;
  }

  request(id: string) {
    if (!this.requested.has(id)) {
      this.requested.add(id);
      this.pending.add(id);
    }
  }

  async renderNext(client: BrowserTextClient, isDisposed: () => boolean) {
    const id = this.pending.values().next().value!;
    this.pending.delete(id);
    try {
      const preview = await client.preview(id);
      if (!isDisposed()) this.onThumbnail(id, preview);
    } catch (error) {
      if (!isDisposed())
        this.onThumbnail(
          id,
          null,
          error instanceof Error
            ? error.message
            : "Cannot render this font preview."
        );
    } finally {
      this.requested.delete(id);
    }
  }
}
