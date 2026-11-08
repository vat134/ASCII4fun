import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  fireEvent,
  render as renderView,
  screen,
  waitFor,
  within
} from "@testing-library/react";
import { VirtuosoGridMockContext } from "react-virtuoso";
import type { ReactElement } from "react";
import { FontGallery } from "../../src/web/figlet/font-gallery";
import { ConversionWorkspace } from "../../src/web/workspace/conversion-workspace";
import type { ImageConfiguration } from "../../src/web/images/image-conversion";
import type { AsciiPreviewResult } from "../../src/web/rendering/ascii-preview-result";

function render(view: ReactElement) {
  return renderView(
    <VirtuosoGridMockContext.Provider
      value={{
        viewportHeight: 480,
        viewportWidth: 600,
        itemHeight: 160,
        itemWidth: 300
      }}
    >
      {view}
    </VirtuosoGridMockContext.Provider>
  );
}

const mockArtwork: AsciiPreviewResult = {
  text: "art",
  widthInCells: 3,
  heightInCells: 1,
  widthInPixels: 36,
  heightInPixels: 24,
  pixels: new Uint8ClampedArray(36 * 24 * 4)
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
jest.mock("../../src/web/figlet/browser-text-client", () => ({
  BrowserTextClient: class {
    fonts = async () => [
      {
        id: "neon",
        name: "Neon",
        category: "Stylized & Retro",
        preview: mockArtwork
      },
      {
        id: "rounded",
        name: "Rounded",
        category: "Clean & Terminal",
        preview: mockArtwork
      },
      {
        id: "tdf-colored",
        name: "Colored",
        category: "TheDraw Color",
        hasNativeColors: true,
        preview: mockArtwork
      }
    ];
    palette = async () => ["#000000", "#0000AA", "#FFFFFF"];
    convert = (
      text: string,
      fontId: string,
      foregroundColor: string,
      colorReplacements: Record<string, string>
    ) => mockConvert(text, fontId, foregroundColor, colorReplacements);
    dispose = () => mockDispose();
  }
}));
jest.mock("../../src/web/images/browser-image-client", () => ({
  BrowserImageClient: class {}
}));
jest.mock("../../src/web/rendering/use-raster-preview", () => ({
  useRasterPreview: () => {}
}));
const configuration: ImageConfiguration = {
  defaultOutputWidthInCells: 80,
  minOutputWidthInCells: 16,
  maxOutputWidthInCells: 180,
  defaultCharacterRamp: "@ .",
  defaultCharacterCellAspectRatio: 0.5,
  maxEncodedBytes: 1024,
  requestToken: "test",
  minToneAdjustment: -40,
  maxToneAdjustment: 40,
  maxPercentage: 100,
  defaultMonochromeColor: { red: 255, green: 255, blue: 255 },
  defaultBackgroundColor: { red: 0, green: 0, blue: 0 }
};
beforeEach(() => {
  mockConvert.mockReset().mockResolvedValue(mockArtwork);
  mockDispose.mockClear();
});

test("mounts and requests only a viewport of cards from a large font catalog", async () => {
  const onPreview = jest.fn();
  render(
    <FontGallery
      fonts={Array.from({ length: 227 }, (_, index) => ({
        id: `font-${index}`,
        name: `Font ${index}`,
        category: "Banners",
        preview: null
      }))}
      fontId="font-0"
      onChoose={jest.fn()}
      onPreview={onPreview}
      status="ready"
    />
  );
  await screen.findByRole("button", { name: "Font 0" });
  const cards = within(screen.getByLabelText("Font cards")).getAllByRole(
    "button"
  );
  expect(cards.length).toBeGreaterThan(1);
  expect(cards.length).toBeLessThanOrEqual(20);
  expect(onPreview).toHaveBeenCalledTimes(cards.length);
  expect(
    screen.queryByRole("button", { name: "Font 226" })
  ).not.toBeInTheDocument();
});

test("edits individual authored colors, retains them between text/fonts/modes and resets the palette", async () => {
  render(<ConversionWorkspace configuration={configuration} />);
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  fireEvent.click(await screen.findByRole("button", { name: "Colored" }));
  const blue = await screen.findByLabelText("Font color #0000AA");
  expect(
    screen.queryByRole("switch", { name: "Use font colors" })
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Text color")).not.toBeInTheDocument();
  expect(blue).toHaveValue("#0000aa");
  fireEvent.change(blue, { target: { value: "#ff3300" } });
  await waitFor(() =>
    expect(mockConvert).toHaveBeenLastCalledWith(
      "ASCII Text",
      "tdf-colored",
      "",
      { "#0000AA": "#ff3300" }
    )
  );
  expect(screen.getByLabelText("Font color #FFFFFF")).toHaveValue("#ffffff");
  fireEvent.change(screen.getByLabelText("Text", { selector: "textarea" }), {
    target: { value: "Other" }
  });
  await waitFor(() =>
    expect(mockConvert).toHaveBeenLastCalledWith("Other", "tdf-colored", "", {
      "#0000AA": "#ff3300"
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "Rounded" }));
  expect(screen.getByLabelText("Text color")).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Colored" }));
  expect(screen.getByLabelText("Font color #0000AA")).toHaveValue("#ff3300");
  fireEvent.click(screen.getByRole("tab", { name: "Media" }));
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  expect(await screen.findByLabelText("Font color #0000AA")).toHaveValue(
    "#ff3300"
  );
  fireEvent.click(screen.getByRole("button", { name: "Reset text settings" }));
  await waitFor(() =>
    expect(mockConvert).toHaveBeenLastCalledWith("Other", "tdf-colored", "", {})
  );
  expect(screen.getByLabelText("Font color #0000AA")).toHaveValue("#0000aa");
});

test("opens Text, renders typed text in the selected font and preserves it between modes", async () => {
  render(<ConversionWorkspace configuration={configuration} />);
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  const tab = screen.getByRole("tab", { name: "Text", selected: true });
  expect(tab).toHaveFocus();
  expect(screen.getByLabelText("Text", { selector: "textarea" })).toHaveValue(
    "ASCII Text"
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Neon" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  );
  fireEvent.change(screen.getByLabelText("Text", { selector: "textarea" }), {
    target: { value: "Hello\nWorld" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Rounded" }));
  await waitFor(() =>
    expect(mockConvert).toHaveBeenLastCalledWith(
      "Hello\nWorld",
      "rounded",
      "#ffffff",
      {}
    )
  );
  const cards = within(screen.getByRole("region", { name: "Fonts" }));
  fireEvent.click(screen.getByRole("button", { name: "Stylized & Retro" }));
  expect(
    cards.queryByRole("button", { name: "Rounded" })
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "Text preview" })
  ).toHaveTextContent("Rounded");
  fireEvent.click(screen.getByRole("button", { name: "All fonts" }));
  expect(cards.getByRole("button", { name: "Rounded" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  fireEvent.click(screen.getByRole("tab", { name: "Media" }));
  expect(screen.getByRole("button", { name: "Original" })).toBeVisible();
  expect(mockDispose).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  expect(screen.getByLabelText("Text", { selector: "textarea" })).toHaveValue(
    "Hello\nWorld"
  );
  expect(screen.getByRole("button", { name: "Rounded" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await waitFor(() =>
    expect(mockConvert).toHaveBeenLastCalledWith(
      "Hello\nWorld",
      "rounded",
      "#ffffff",
      {}
    )
  );
});

test("shows an empty preview when text is cleared and recovers from unsupported input", async () => {
  render(<ConversionWorkspace configuration={configuration} />);
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  await screen.findByRole("button", { name: "Neon" });
  mockConvert.mockRejectedValueOnce(
    new Error("This font does not contain U+1F642.")
  );
  fireEvent.change(screen.getByLabelText("Text", { selector: "textarea" }), {
    target: { value: "🙂" }
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("U+1F642");
  fireEvent.change(screen.getByLabelText("Text", { selector: "textarea" }), {
    target: { value: "" }
  });
  expect(screen.getByText("Enter text to see your artwork")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Text", { selector: "textarea" }), {
    target: { value: "Recovered" }
  });
  await waitFor(() =>
    expect(screen.getByRole("img", { name: /ASCII preview/ })).toBeVisible()
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("preserves blank cells and line breaks when copying and reports clipboard errors with retry", async () => {
  const writeText = jest
    .fn<(value: string) => Promise<void>>()
    .mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText }
  });
  mockConvert.mockResolvedValue({
    ...mockArtwork,
    text: " A  \n\n  B \n █🙂 "
  });
  render(<ConversionWorkspace configuration={configuration} />);
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  const copy = screen.getByRole("button", { name: "Copy text" });
  expect(copy).toBeDisabled();
  await waitFor(() => expect(copy).toBeEnabled());
  fireEvent.click(copy);
  await waitFor(() => expect(copy).toHaveTextContent("Copied"));
  expect(writeText).toHaveBeenCalledWith(" A  \n\n  B \n █🙂 ");
  writeText.mockRejectedValueOnce(
    new DOMException("Blocked", "NotAllowedError")
  );
  fireEvent.click(copy);
  expect(await screen.findByRole("alert")).toHaveTextContent("Copy blocked");
  fireEvent.click(copy);
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  );
  fireEvent.change(screen.getByLabelText("Text", { selector: "textarea" }), {
    target: { value: "" }
  });
  expect(copy).toBeDisabled();
});

test("retains text color and zoom across modes and resets appearance without changing text or font", async () => {
  render(<ConversionWorkspace configuration={configuration} />);
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  await screen.findByRole("button", { name: "Rounded" });
  fireEvent.click(screen.getByRole("button", { name: "Rounded" }));
  fireEvent.change(screen.getByLabelText("Text color"), {
    target: { value: "#33ffaa" }
  });
  expect(
    within(screen.getByLabelText("Text settings")).queryByRole("slider")
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  await waitFor(() =>
    expect(mockConvert).toHaveBeenLastCalledWith(
      "ASCII Text",
      "rounded",
      "#33ffaa",
      {}
    )
  );
  expect(
    within(screen.getByLabelText("Text preview")).getByLabelText(
      "Preview zoom level"
    )
  ).toHaveTextContent("125%");
  fireEvent.click(screen.getByRole("tab", { name: "Media" }));
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  expect(screen.getByLabelText("Text color")).toHaveValue("#33ffaa");
  expect(
    within(screen.getByLabelText("Text preview")).getByLabelText(
      "Preview zoom level"
    )
  ).toHaveTextContent("125%");
  fireEvent.click(screen.getByRole("button", { name: "Reset text settings" }));
  expect(screen.getByLabelText("Text color")).toHaveValue("#ffffff");
  expect(
    within(screen.getByLabelText("Text preview")).getByLabelText(
      "Preview zoom level"
    )
  ).toHaveTextContent("100%");
  expect(screen.getByLabelText("Text", { selector: "textarea" })).toHaveValue(
    "ASCII Text"
  );
  await waitFor(() =>
    expect(mockConvert).toHaveBeenLastCalledWith(
      "ASCII Text",
      "rounded",
      "#ffffff",
      {}
    )
  );
});
