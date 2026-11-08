import type { ImageConversionResult } from "./image-conversion";

const entryOverheadInBytes = 256;
const maxEntries = 24;

// Account for retained RGBA backing storage as well as UTF-16 text and keys.
function estimateBytes(key: string, result: ImageConversionResult): number {
  return (
    (key.length + result.text.length) * 2 +
    result.pixels.byteLength +
    (result.animation ? result.animation.timeline.length * 64 + 128 : 0) +
    entryOverheadInBytes
  );
}

/** Retains completed results for one selected source; never owns DOM images or files. */
export class ImageResultCache {
  static readonly maxBytes = 16 * 1024 * 1024;
  private readonly entries = new Map<
    string,
    { result: ImageConversionResult; bytes: number }
  >();
  private bytes = 0;

  get retainedBytes() {
    return this.bytes;
  }

  get(key: string): ImageConversionResult | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.result;
  }

  set(key: string, result: ImageConversionResult) {
    const bytes = estimateBytes(key, result);
    this.remove(key);
    // Large artwork remains usable as the current result, without displacing the cache.
    if (bytes > ImageResultCache.maxBytes / 2) return;
    while (
      this.bytes + bytes > ImageResultCache.maxBytes ||
      this.entries.size >= maxEntries
    ) {
      this.remove(this.entries.keys().next().value!);
    }
    this.entries.set(key, { result, bytes });
    this.bytes += bytes;
  }

  clear() {
    this.entries.clear();
    this.bytes = 0;
  }

  private remove(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.bytes -= entry.bytes;
    this.entries.delete(key);
  }
}
