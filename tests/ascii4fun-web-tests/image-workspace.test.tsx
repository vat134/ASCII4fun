import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen
} from "@testing-library/react";
import { ImageWorkspace } from "../../src/web/images/image-workspace";
import { useImageConversion } from "../../src/web/images/use-image-conversion";
import type {
  CharacterImageOptions,
  ImageConfiguration,
  ImageConversionResult
} from "../../src/web/images/image-conversion";

const mockConvert =
  jest.fn<(options: CharacterImageOptions) => Promise<ImageConversionResult>>();
const mockDispose = jest.fn();
const mockExport = jest.fn<() => Promise<Blob>>();
jest.mock("../../src/web/images/browser-image-client", () => ({
  BrowserImageClient: class {
    convert = (options: CharacterImageOptions) => mockConvert(options);
    dispose = () => mockDispose();
  }
}));
jest.mock("../../src/web/rendering/export-preview-png", () => ({
  exportPreviewPng: () => mockExport()
}));
const configuration: ImageConfiguration = {
  defaultOutputWidthInCells: 80,
  minOutputWidthInCells: 16,
  maxOutputWidthInCells: 180,
  defaultCharacterRamp: "@%#*+=-:. ",
  defaultCharacterCellAspectRatio: 0.5,
  maxEncodedBytes: 1024,
  requestToken: "token",
  minToneAdjustment: -40,
  maxToneAdjustment: 40,
  maxPercentage: 100,
  defaultMonochromeColor: { red: 255, green: 255, blue: 255 },
  defaultBackgroundColor: { red: 0, green: 0, blue: 0 }
};
const artwork: ImageConversionResult = {
  text: "@ ",
  widthInCells: 2,
  heightInCells: 1,
  widthInPixels: 24,
  heightInPixels: 24,
  pixels: new Uint8ClampedArray(24 * 24 * 4)
};
const upload = () =>
  fireEvent.change(screen.getByLabelText("Upload image"), {
    target: { files: [new File(["image"], "source.png")] }
  });
beforeEach(() => {
  mockConvert.mockReset().mockResolvedValue(artwork);
  mockDispose.mockClear();
  mockExport.mockReset().mockResolvedValue(new Blob(["png"]));
  URL.createObjectURL = jest.fn(() => "blob:test-image");
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    putImageData: jest.fn(),
    drawImage: jest.fn()
  } as unknown as CanvasRenderingContext2D);
  globalThis.OffscreenCanvas = class {
    constructor(
      public width: number,
      public height: number
    ) {}
    getContext() {
      return { putImageData: jest.fn() };
    }
  } as unknown as typeof OffscreenCanvas;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.ImageData = class {
    constructor(
      public data: Uint8ClampedArray,
      public width: number,
      public height: number
    ) {}
  } as typeof ImageData;
});
afterEach(() => {
  jest.restoreAllMocks();
});

test("exposes neutral tone, Original mode, white Mono and black background defaults", () => {
  render(
    <ImageWorkspace configuration={configuration} onTextMode={jest.fn()} />
  );
  expect(screen.getByRole("button", { name: "Original" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(screen.getByLabelText("Mono color")).toHaveValue("#ffffff");
  expect(screen.getByLabelText("Mono color")).toBeDisabled();
  expect(screen.getByLabelText("Background")).toHaveValue("#000000");
  expect(screen.queryByLabelText("Style")).not.toBeInTheDocument();
  for (const label of ["Contrast", "Brightness", "Shadow lift", "Source photo"])
    expect(
      screen.getByLabelText(label, { selector: 'input[type="range"]' })
    ).toHaveValue("0");
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Copy text" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Media URL" })).toBeDisabled();
});

test("renders current pixels, blocks pending exports and keeps zoom local", async () => {
  const writeText = jest
    .fn<(value: string) => Promise<void>>()
    .mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText }
  });
  const downloads: string[] = [];
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    downloads.push(this.download);
  });
  render(
    <ImageWorkspace configuration={configuration} onTextMode={jest.fn()} />
  );
  await act(async () => upload());
  const copy = screen.getByRole("button", { name: "Copy text" });
  expect(copy).toBeEnabled();
  await act(async () => fireEvent.click(copy));
  expect(writeText).toHaveBeenCalledWith("@ ");
  expect(screen.getByRole("img", { name: /ASCII preview/ })).toHaveAttribute(
    "width",
    "24"
  );
  expect(mockConvert.mock.calls[0]![0].sourceColors).toBe(true);
  let finish!: (result: ImageConversionResult) => void;
  mockConvert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  fireEvent.click(screen.getByRole("button", { name: "Mono" }));
  expect(screen.queryByText("Converting image")).toBeNull();
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  expect(copy).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByLabelText("Preview zoom level")).toHaveTextContent("125%");
  expect(mockConvert).toHaveBeenCalledTimes(2);
  await act(async () => finish({ ...artwork, text: "X " }));
  expect(copy).toBeEnabled();
  await act(async () => fireEvent.click(copy));
  expect(writeText).toHaveBeenLastCalledWith("X ");
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Download PNG" }))
  );
  fireEvent.click(screen.getByRole("button", { name: "Download .txt" }));
  expect(downloads).toEqual(["source.png", "source.txt"]);
  fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
  expect(screen.getByRole("button", { name: "Original" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(mockConvert).toHaveBeenCalledTimes(2);
});

test("rejects excessive input before creating conversion work", () => {
  const { result } = renderHook(() => useImageConversion(configuration));
  act(() =>
    result.current.selectImage(new File([new Uint8Array(1025)], "large.png"))
  );
  expect(result.current.state.status).toBe("error");
  expect(mockConvert).not.toHaveBeenCalled();
});

test("replaces a source immediately, terminates old work and ignores obsolete completion", async () => {
  let finish!: (value: ImageConversionResult) => void;
  mockConvert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const { result, unmount } = renderHook(() =>
    useImageConversion(configuration)
  );
  act(() => result.current.selectImage(new File(["first"], "first.png")));
  await act(async () =>
    result.current.selectImage(new File(["next"], "next.png"))
  );
  expect(mockDispose).toHaveBeenCalledTimes(1);
  expect(result.current.state).toEqual({ status: "ready", result: artwork });
  await act(async () => finish({ ...artwork, text: "OLD" }));
  expect(result.current.state).toEqual({ status: "ready", result: artwork });
  unmount();
  expect(mockDispose).toHaveBeenCalledTimes(2);
});

test("Retry restarts the source worker and Clear preserves settings through StrictMode", async () => {
  mockConvert.mockRejectedValueOnce(new Error("Unreadable image"));
  render(
    <StrictMode>
      <ImageWorkspace configuration={configuration} onTextMode={jest.fn()} />
    </StrictMode>
  );
  fireEvent.click(screen.getByRole("button", { name: "Mono" }));
  await act(async () => upload());
  expect(screen.getByRole("alert")).toHaveTextContent("Unreadable image");
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  );
  expect(mockDispose).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
  expect(screen.getByRole("button", { name: "Mono" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});

test("density is enabled by default and reset restores it after disabling", async () => {
  render(
    <ImageWorkspace configuration={configuration} onTextMode={jest.fn()} />
  );
  const toggle = screen.getByRole("switch", { name: "Measured glyph density" });
  expect(toggle).toHaveAttribute("aria-checked", "true");
  fireEvent.click(toggle);
  await act(async () => upload());
  expect(mockConvert.mock.lastCall![0]).toMatchObject({
    useMeasuredGlyphDensity: false
  });
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Reset to default" }))
  );
  expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(mockConvert.mock.lastCall![0]).toMatchObject({
    useMeasuredGlyphDensity: true
  });
});

test("color controls update shared options and retain them when clearing an error", async () => {
  render(
    <ImageWorkspace configuration={configuration} onTextMode={jest.fn()} />
  );
  fireEvent.click(screen.getByRole("button", { name: "Mono" }));
  fireEvent.change(screen.getByLabelText("Mono color"), {
    target: { value: "#00ff00" }
  });
  fireEvent.change(screen.getByLabelText("Background"), {
    target: { value: "#102030" }
  });
  mockConvert.mockRejectedValueOnce(new Error("Bad input"));
  await act(async () => upload());
  expect(mockConvert.mock.calls[0]![0]).toMatchObject({
    monochromeColor: { red: 0, green: 255, blue: 0 },
    backgroundColor: { red: 16, green: 32, blue: 48 }
  });
  expect(screen.getByRole("button", { name: "Copy text" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByLabelText("Background")).toHaveValue("#102030");
  await act(async () => upload());
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeEnabled();
});

test("reports PNG encoding failure and keeps the current result available for retry", async () => {
  mockExport.mockRejectedValueOnce(new Error("PNG encoding failed"));
  render(
    <ImageWorkspace configuration={configuration} onTextMode={jest.fn()} />
  );
  await act(async () => upload());
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Download PNG" }))
  );
  expect(screen.getByRole("alert")).toHaveTextContent("PNG encoding failed");
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeEnabled();
});
