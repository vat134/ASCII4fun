import { afterEach, expect, jest, test } from "@jest/globals";
import { BrowserVideoClient } from "../../src/web/videos/browser-video-client";

const mockCreated = jest.fn();
jest.mock("../../src/web/images/browser-image-client", () => ({
  BrowserImageClient: class {
    constructor() {
      mockCreated();
    }
  }
}));

afterEach(() => {
  jest.restoreAllMocks();
  mockCreated.mockClear();
});

test("does not start a conversion Worker when video capture cannot be created", () => {
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  expect(
    () =>
      new BrowserVideoClient("blob:source", {
        widthInPixels: 16,
        heightInPixels: 16,
        durationMs: 1000,
        framesPerSecond: 10,
        frameCount: 10,
        hasAudio: false
      })
  ).toThrow("Video frame capture is unavailable");
  expect(mockCreated).not.toHaveBeenCalled();
});
