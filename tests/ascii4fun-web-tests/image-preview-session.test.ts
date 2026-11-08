import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  ImagePreviewSession,
  type ConversionState
} from "../../src/web/images/image-preview-session";
import type {
  CharacterImageOptions,
  ImageConversionResult
} from "../../src/web/images/image-conversion";

const mockConvert =
  jest.fn<(options: CharacterImageOptions) => Promise<ImageConversionResult>>();
const mockDispose = jest.fn();
jest.mock("../../src/web/images/browser-image-client", () => ({
  BrowserImageClient: class {
    convert = (options: CharacterImageOptions) => mockConvert(options);
    dispose = () => mockDispose();
  }
}));
const defaults: CharacterImageOptions = {
  outputWidthInCells: 80,
  style: "characters",
  characterRamp: "@ ",
  invert: true,
  sourceColors: true,
  contrast: 0,
  brightness: 0,
  shadowLift: 0,
  sourcePhotoOpacity: 0,
  monochromeColor: { red: 255, green: 255, blue: 255 },
  backgroundColor: { red: 0, green: 0, blue: 0 }
};
const result = (width: number): ImageConversionResult => ({
  text: String(width),
  widthInCells: width,
  heightInCells: 1,
  widthInPixels: width,
  heightInPixels: 1,
  pixels: new Uint8ClampedArray(width * 4)
});
const states: ConversionState[] = [];
let session: ImagePreviewSession;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
function deferred() {
  let finish!: (value: ImageConversionResult) => void;
  let fail!: (error: Error) => void;
  mockConvert.mockImplementationOnce(
    () =>
      new Promise((resolve, reject) => {
        finish = resolve;
        fail = reject;
      })
  );
  return {
    finish: (width: number) => finish(result(width)),
    fail: (error: Error) => fail(error)
  };
}
beforeEach(() => {
  mockConvert.mockReset();
  mockDispose.mockClear();
  states.length = 0;
  session = new ImagePreviewSession(
    new File(["image"], "source.png"),
    (state) => states.push(state)
  );
});

test("finishes active work, shows an intermediate result and coalesces pending settings", async () => {
  const first = deferred(),
    last = deferred();
  session.request(defaults);
  for (const width of [90, 100, 160])
    session.request({ ...defaults, outputWidthInCells: width });
  expect(mockConvert).toHaveBeenCalledTimes(1);
  first.finish(80);
  await flush();
  expect(states.at(-1)).toMatchObject({
    status: "pending",
    result: { widthInCells: 80 }
  });
  expect(mockConvert.mock.calls[1]![0].outputWidthInCells).toBe(160);
  last.finish(160);
  await flush();
  expect(states.at(-1)).toMatchObject({
    status: "ready",
    result: { widthInCells: 160 }
  });
});

test("a newer cache hit cannot be overwritten by an older completion", async () => {
  mockConvert.mockResolvedValueOnce(result(80));
  session.request(defaults);
  await flush();
  const cached = states.at(-1),
    older = deferred(),
    newest = deferred();
  session.request({ ...defaults, outputWidthInCells: 160 });
  session.request(defaults);
  expect(states.at(-1)).toEqual(cached);
  session.request({ ...defaults, outputWidthInCells: 240 });
  older.finish(160);
  await flush();
  expect(states.at(-1)).toMatchObject({
    status: "pending",
    result: { widthInCells: 80 }
  });
  newest.finish(240);
  await flush();
  session.request({ ...defaults, outputWidthInCells: 160 });
  expect(states.at(-1)).toMatchObject({
    status: "ready",
    result: { widthInCells: 160 }
  });
  expect(mockConvert).toHaveBeenCalledTimes(3);
});

test("keys every option canonically including tone and composition colors", async () => {
  mockConvert.mockImplementation(async (options) =>
    result(options.outputWidthInCells)
  );
  const variants: CharacterImageOptions[] = [
    defaults,
    { ...defaults, style: "braille" },
    { ...defaults, invert: false },
    { ...defaults, sourceColors: false },
    { ...defaults, characterRamp: "# " },
    { ...defaults, outputWidthInCells: 90 },
    { ...defaults, contrast: 10 },
    { ...defaults, brightness: 10 },
    { ...defaults, shadowLift: 50 },
    { ...defaults, sourcePhotoOpacity: 35 },
    { ...defaults, monochromeColor: { red: 0, green: 255, blue: 0 } },
    { ...defaults, backgroundColor: { red: 255, green: 0, blue: 0 } }
  ];
  for (const options of variants) {
    session.request(options);
    await flush();
  }
  expect(mockConvert).toHaveBeenCalledTimes(variants.length);
  for (const options of variants)
    session.request(
      Object.fromEntries(
        Object.entries(options).reverse()
      ) as CharacterImageOptions
    );
  expect(mockConvert).toHaveBeenCalledTimes(variants.length);
});

test("ignores obsolete failure, reports current failure and supports retry", async () => {
  const obsolete = deferred();
  mockConvert.mockRejectedValueOnce(new Error("Unreadable image"));
  session.request(defaults);
  session.request({ ...defaults, outputWidthInCells: 160 });
  obsolete.fail(new Error("Old failure"));
  await flush();
  expect(states.filter((state) => state.status === "error")).toEqual([
    { status: "error", message: "Unreadable image" }
  ]);
  mockConvert.mockResolvedValueOnce(result(160));
  session.request({ ...defaults, outputWidthInCells: 160 });
  await flush();
  expect(states.at(-1)?.status).toBe("ready");
});

test("disposal terminates work and ignores late completion without starting pending work", async () => {
  const first = deferred();
  session.request(defaults);
  session.request({ ...defaults, outputWidthInCells: 160 });
  void session.dispose();
  expect(mockDispose).toHaveBeenCalledTimes(1);
  const before = states.length;
  first.finish(80);
  await flush();
  session.request(defaults);
  expect(states).toHaveLength(before);
  expect(mockConvert).toHaveBeenCalledTimes(1);
});

test("keeps oversized results usable outside the history cache", async () => {
  mockConvert.mockResolvedValue({
    ...result(80),
    pixels: new Uint8ClampedArray(10 * 1024 * 1024)
  });
  session.request(defaults);
  await flush();
  session.request(defaults);
  expect(states.at(-1)?.status).toBe("ready");
  expect(mockConvert).toHaveBeenCalledTimes(1);
});
