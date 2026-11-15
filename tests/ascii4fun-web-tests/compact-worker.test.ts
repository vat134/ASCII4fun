import { expect, jest, test } from "@jest/globals";
import { renderCompactRequest } from "../../src/web/compact/compact-worker";
import type { BrowserEngine } from "../../src/web/browser-engine/browser-engine";
import type { BrowserImageSource } from "../../src/web/images/worker/browser-image-source";
import { compactOptions } from "./compact-fixtures";

jest.mock("../../src/web/browser-engine/magick-glyph-renderer", () => ({
  loadFonts: async () => {}
}));

test("generates all look thumbnails from the same engine samples and reuses them only across look changes", async () => {
  const convert = jest.fn(
    (_rgba: Uint8Array, _width: number, _height: number, json: string) =>
      JSON.stringify({
        text: JSON.parse(json).look,
        widthInCells: 1,
        heightInCells: 1
      })
  );
  const engine = {
    ValidateCompactSource: jest.fn(),
    ConvertCompact: convert,
    FontNames: () => [],
    Rasterize: () => new Uint8Array([255, 255, 255]),
    Geometry: () => [1, 1]
  } as unknown as BrowserEngine;
  const rgba = new Uint8Array(32);
  const source = {
    load: async () => {},
    compact: () => ({
      rgba,
      width: 2,
      height: 4,
      layout: { sampleWidthInPixels: 2, sampleHeightInPixels: 4 }
    })
  } as unknown as BrowserImageSource;
  const post = jest.spyOn(self, "postMessage").mockImplementation(() => {});
  try {
    await renderCompactRequest(engine, source, {
      id: 1,
      type: "load-compact",
      bytes: new Uint8Array([1])
    });
    await renderCompactRequest(engine, source, {
      id: 2,
      type: "convert-compact",
      options: compactOptions
    });
    expect(convert).toHaveBeenCalledTimes(5);
    expect(post.mock.calls.at(-1)?.[0]).toMatchObject({
      value: {
        lookPreviews: {
          photo: "photo",
          texture: "texture",
          sketch: "sketch",
          soft: "soft",
          poster: "poster"
        }
      }
    });
    expect(convert.mock.calls.every((call) => call[0] === rgba)).toBe(true);
    await renderCompactRequest(engine, source, {
      id: 3,
      type: "convert-compact",
      options: { ...compactOptions, look: "sketch" }
    });
    expect(convert).toHaveBeenCalledTimes(6);
    await renderCompactRequest(engine, source, {
      id: 4,
      type: "convert-compact",
      options: { ...compactOptions, gamma: 2 }
    });
    expect(convert).toHaveBeenCalledTimes(11);
  } finally {
    post.mockRestore();
  }
});
