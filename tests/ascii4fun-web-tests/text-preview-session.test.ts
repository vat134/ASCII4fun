import { expect, jest, test, beforeEach } from "@jest/globals";
import { TextPreviewSession } from "../../src/web/figlet/text-preview-session";
import type {
  TextFont,
  TextPreviewState
} from "../../src/web/figlet/text-conversion";
import type { AsciiPreviewResult } from "../../src/web/rendering/ascii-preview-result";

const mockArtwork: AsciiPreviewResult = {
  text: "A",
  widthInCells: 1,
  heightInCells: 1,
  widthInPixels: 12,
  heightInPixels: 24,
  pixels: new Uint8ClampedArray(12 * 24 * 4)
};
const mockConvert =
  jest.fn<
    (
      text: string,
      fontId: string,
      foregroundColor: string,
      colorReplacements: Record<string, string>
    ) => Promise<AsciiPreviewResult>
  >();
const mockDispose = jest.fn();
const mockFonts = jest.fn<() => Promise<TextFont[]>>();
const mockPalette = jest.fn<(id: string) => Promise<string[]>>();
const mockPreview = jest.fn<(id: string) => Promise<AsciiPreviewResult>>();
jest.mock("../../src/web/figlet/browser-text-client", () => ({
  BrowserTextClient: class {
    fonts = () => mockFonts();
    preview = (id: string) => mockPreview(id);
    palette = (id: string) => mockPalette(id);
    convert = (
      text: string,
      fontId: string,
      foregroundColor: string,
      colorReplacements: Record<string, string>
    ) => mockConvert(text, fontId, foregroundColor, colorReplacements);
    dispose = () => mockDispose();
  }
}));
const tick = async () => {
  for (let index = 0; index < 8; index++) await Promise.resolve();
};
beforeEach(() => {
  mockConvert.mockReset().mockResolvedValue(mockArtwork);
  mockDispose.mockClear();
  mockPalette.mockReset().mockResolvedValue(["#000000", "#0000AA", "#FFFFFF"]);
  mockPreview.mockReset().mockResolvedValue(mockArtwork);
  mockFonts.mockReset().mockResolvedValue([
    {
      id: "neon",
      name: "Neon",
      category: "Stylized & Retro",
      preview: mockArtwork
    }
  ]);
});

test("loads only requested cards, deduplicates them and prioritizes the latest text between thumbnails", async () => {
  let complete!: (value: AsciiPreviewResult) => void;
  mockPreview.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      })
  );
  const onThumbnail = jest.fn();
  const session = new TextPreviewSession(
    () => {},
    () => {},
    onThumbnail
  );
  await tick();
  expect(mockPreview).not.toHaveBeenCalled();
  session.preview("neon");
  session.preview("neon");
  session.preview("rounded");
  session.request("old", "neon");
  session.request("latest", "rounded", "");
  complete(mockArtwork);
  await tick();
  await tick();
  expect(mockConvert.mock.calls).toEqual([["latest", "rounded", "", {}]]);
  expect(mockPreview.mock.calls).toEqual([["neon"], ["rounded"]]);
  expect(mockConvert.mock.invocationCallOrder[0]).toBeLessThan(
    mockPreview.mock.invocationCallOrder[1]!
  );
  expect(onThumbnail).toHaveBeenCalledWith("neon", mockArtwork);
  session.dispose();
});

test("a failed card reports its own error without replacing the active artwork", async () => {
  mockPreview.mockRejectedValueOnce(new Error("Missing font"));
  const onState = jest.fn();
  const onThumbnail = jest.fn();
  const session = new TextPreviewSession(onState, () => {}, onThumbnail);
  session.request("A", "neon");
  await tick();
  session.preview("broken");
  await tick();
  expect(onThumbnail).toHaveBeenCalledWith("broken", null, "Missing font");
  expect(onState).toHaveBeenLastCalledWith({
    status: "ready",
    result: mockArtwork
  });
  session.dispose();
});

test("retains only the latest edit and never displays an outdated result", async () => {
  let complete!: (value: AsciiPreviewResult) => void;
  mockConvert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      })
  );
  const states: TextPreviewState[] = [];
  const session = new TextPreviewSession(
    (state) => states.push(state),
    () => {}
  );
  session.request("A", "");
  await tick();
  session.request("AB", "neon");
  session.request("ABC", "rounded", "#33ffaa");
  complete({ ...mockArtwork, text: "obsolete" });
  await tick();
  expect(mockConvert.mock.calls).toEqual([
    ["A", "neon", "#ffffff", {}],
    ["ABC", "rounded", "#33ffaa", {}]
  ]);
  expect(states.filter((state) => state.status === "ready")).toEqual([
    { status: "ready", result: mockArtwork }
  ]);
  session.dispose();
});

test("startup failure remains actionable after another edit", async () => {
  mockFonts.mockRejectedValueOnce(new Error("Cannot load engine assets"));
  const onState = jest.fn<(state: TextPreviewState) => void>();
  const session = new TextPreviewSession(onState, () => {});
  session.request("A", "");
  await tick();
  session.request("Another edit", "neon");
  expect(onState).toHaveBeenLastCalledWith({
    status: "error",
    message: "Cannot load engine assets"
  });
  expect(mockConvert).not.toHaveBeenCalled();
  session.dispose();
});

test("clearing text invalidates active work and does not ask the engine to render empty input", async () => {
  let complete!: (value: AsciiPreviewResult) => void;
  mockConvert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      })
  );
  const onState = jest.fn<(state: TextPreviewState) => void>();
  const session = new TextPreviewSession(onState, () => {});
  session.request("A", "neon");
  await tick();
  session.request("", "neon");
  complete(mockArtwork);
  await tick();
  expect(onState).toHaveBeenLastCalledWith({ status: "empty" });
  expect(mockConvert).toHaveBeenCalledTimes(1);
  session.dispose();
});

test("a missing glyph error can recover with a new edit and disposal suppresses late work", async () => {
  mockConvert.mockRejectedValueOnce(new Error("Unsupported glyph"));
  const onState = jest.fn<(state: TextPreviewState) => void>();
  const session = new TextPreviewSession(onState, () => {});
  session.request("🙂", "neon");
  await tick();
  expect(onState).toHaveBeenLastCalledWith({
    status: "error",
    message: "Unsupported glyph"
  });
  session.request("A", "neon");
  await tick();
  expect(onState).toHaveBeenLastCalledWith({
    status: "ready",
    result: mockArtwork
  });
  session.dispose();
  expect(mockDispose).toHaveBeenCalledTimes(1);
});

test("loads the selected whole-font palette even for empty text, once per session", async () => {
  const onPalette = jest.fn();
  const session = new TextPreviewSession(
    () => {},
    () => {},
    () => {},
    onPalette
  );
  session.request("", "colored", "");
  await tick();
  expect(onPalette).toHaveBeenCalledWith("colored", [
    "#000000",
    "#0000AA",
    "#FFFFFF"
  ]);
  expect(mockConvert).not.toHaveBeenCalled();
  session.request("A", "colored", "", { "#0000AA": "#ff0000" });
  await tick();
  session.request("B", "colored", "", { "#0000AA": "#ff0000" });
  await tick();
  expect(mockPalette).toHaveBeenCalledTimes(1);
  expect(mockConvert).toHaveBeenLastCalledWith("B", "colored", "", {
    "#0000AA": "#ff0000"
  });
  session.dispose();
});

test("palette failure is visible and a later edit retries it", async () => {
  mockPalette.mockRejectedValueOnce(new Error("Cannot read font palette"));
  const onState = jest.fn();
  const session = new TextPreviewSession(onState, () => {});
  session.request("A", "colored", "");
  await tick();
  expect(onState).toHaveBeenLastCalledWith({
    status: "error",
    message: "Cannot read font palette"
  });
  expect(mockConvert).not.toHaveBeenCalled();
  session.request("B", "colored", "");
  await tick();
  expect(onState).toHaveBeenLastCalledWith({
    status: "ready",
    result: mockArtwork
  });
  session.dispose();
});
