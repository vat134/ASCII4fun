import { expect, test } from "@jest/globals";
import { ImageResultCache } from "../../src/web/images/image-result-cache";
import type { ImageConversionResult } from "../../src/web/images/image-conversion";

const result: ImageConversionResult = {
  text: "@ ",
  widthInCells: 2,
  heightInCells: 1,
  pixels: new Uint8ClampedArray(32),
  widthInPixels: 4,
  heightInPixels: 2
};

test("returns the exact result and evicts the least recently used entry within the byte budget", () => {
  const cache = new ImageResultCache();
  const large = { ...result, text: "x".repeat(3 * 1024 * 1024) };
  cache.set("first", large);
  cache.set("second", large);
  expect(cache.get("first")).toBe(large);
  cache.set("third", large);
  expect(cache.get("second")).toBeUndefined();
  expect(cache.get("first")).toBe(large);
  expect(cache.get("third")).toBe(large);
  expect(cache.retainedBytes).toBeLessThanOrEqual(ImageResultCache.maxBytes);
});

test("bypasses oversized results without evicting useful entries and clears retained data", () => {
  const cache = new ImageResultCache();
  cache.set("small", result);
  cache.set("oversized", {
    ...result,
    text: "x".repeat(ImageResultCache.maxBytes)
  });
  expect(cache.get("oversized")).toBeUndefined();
  expect(cache.get("small")).toBe(result);
  cache.clear();
  expect(cache.get("small")).toBeUndefined();
  expect(cache.retainedBytes).toBe(0);
});

test("accounts for the actual RGBA backing storage without relying on cell geometry", () => {
  const cache = new ImageResultCache();
  cache.set("key", result);
  expect(cache.retainedBytes).toBeGreaterThanOrEqual(
    (result.text.length + 3) * 2 + result.pixels.byteLength
  );
  cache.set("large-pixels", {
    ...result,
    pixels: new Uint8ClampedArray(10 * 1024 * 1024)
  });
  expect(cache.get("large-pixels")).toBeUndefined();
  expect(cache.get("key")).toBe(result);
});

test("bounds entry overhead for tiny results and handles replacement accounting", () => {
  const cache = new ImageResultCache();
  cache.set("same", result);
  const before = cache.retainedBytes;
  cache.set("same", result);
  expect(cache.retainedBytes).toBe(before);
  for (let index = 0; index < 100; index++) cache.set(String(index), result);
  expect(cache.get("0")).toBeUndefined();
  expect(cache.get("99")).toBe(result);
  expect(cache.retainedBytes).toBeLessThanOrEqual(before * 24);
});

test("does not admit one entry that would consume most of the history budget", () => {
  const cache = new ImageResultCache();
  cache.set("small", result);
  cache.set("dominant", { ...result, text: "x".repeat(5 * 1024 * 1024) });
  expect(cache.get("dominant")).toBeUndefined();
  expect(cache.get("small")).toBe(result);
});
