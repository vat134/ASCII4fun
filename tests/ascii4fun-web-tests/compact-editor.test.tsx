import { beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { CompactEditor } from "../../src/web/compact/compact-editor";
import type {
  CompactArtOptions,
  CompactPreviewResult
} from "../../src/web/compact/compact-types";
import { compactArtwork, compactConfiguration } from "./compact-fixtures";
const mockConvert =
  jest.fn<(options: CompactArtOptions) => Promise<CompactPreviewResult>>();
jest.mock("../../src/web/compact/compact-client", () => ({
  CompactArtClient: class {
    convert = (options: CompactArtOptions) => mockConvert(options);
    dispose() {}
  }
}));
jest.mock("../../src/web/rendering/use-raster-preview", () => ({
  useRasterPreview() {}
}));

beforeEach(() => {
  mockConvert.mockReset().mockResolvedValue(compactArtwork);
  URL.createObjectURL = jest.fn(() => "blob:mini-art");
  URL.revokeObjectURL = jest.fn();
});

function open() {
  render(
    <CompactEditor
      active
      configuration={compactConfiguration}
      maxEncodedBytes={1000}
      onModeChange={jest.fn()}
    />
  );
}
function upload() {
  fireEvent.change(screen.getByLabelText("Upload mini art image"), {
    target: { files: [new File(["photo"], "photo.png", { type: "image/png" })] }
  });
}
async function choose(label: string, value: string) {
  await act(async () =>
    fireEvent.click(
      within(screen.getByRole("group", { name: label })).getByRole("button", {
        name: value
      })
    )
  );
}

test("offers exactly three Steam fields and one field for each other destination without unrelated settings", async () => {
  open();
  const steam = screen.getByRole("group", { name: "Steam field" });
  expect(within(steam).getAllByRole("button")).toHaveLength(3);
  expect(
    within(steam).getByRole("button", { name: "Comment" })
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.queryByText(/blank cells|premium|device|caption/i)
  ).not.toBeInTheDocument();
  await choose("Destination", "Telegram");
  expect(
    screen.queryByRole("group", { name: "Steam field" })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("combobox", { name: /field|device/i })
  ).not.toBeInTheDocument();
  await act(async () => upload());
  expect(mockConvert).toHaveBeenLastCalledWith(
    expect.objectContaining({ destination: "tg", columns: 0 })
  );
  expect(screen.queryByText("Saved message")).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: /ASCII preview/ })).toBeVisible();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});

test("invalidates Copy and downloads immediately when controls change and resets all settings", async () => {
  open();
  await act(async () => upload());
  const copy = screen.getByRole("button", { name: "Copy text" });
  expect(copy).toBeEnabled();
  expect(screen.getByRole("img", { name: /ASCII preview/ })).toBeVisible();
  expect(
    screen.getByRole("group", { name: "Look" }).querySelectorAll("svg")
  ).toHaveLength(5);
  let finish!: (result: CompactPreviewResult) => void;
  mockConvert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  fireEvent.click(screen.getByRole("switch", { name: "Invert" }));
  expect(copy).toBeDisabled();
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  await act(async () => finish(compactArtwork));
  expect(copy).toBeEnabled();
  await act(async () =>
    fireEvent.change(
      screen.getByRole("textbox", { name: "Mini art columns" }),
      { target: { value: "40" } }
    )
  );
  await act(async () =>
    fireEvent.blur(screen.getByRole("textbox", { name: "Mini art columns" }))
  );
  expect(mockConvert).toHaveBeenLastCalledWith(
    expect.objectContaining({ columns: 40, invert: false })
  );
  await act(async () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Reset mini art settings" })
    )
  );
  expect(mockConvert).toHaveBeenLastCalledWith(
    compactConfiguration.defaultOptions
  );
  expect(screen.getByRole("textbox", { name: "Mini art columns" })).toHaveValue(
    "2"
  );
});

test("exposes crop, tone and look controls only for Mini art and copies destination formatting", async () => {
  const writeText = jest
    .fn<(value: string) => Promise<void>>()
    .mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText }
  });
  mockConvert.mockResolvedValue({
    ...compactArtwork,
    payload: { ...compactArtwork.payload, text: "[code]⣿⠀[/code]" }
  });
  open();
  await act(async () => fireEvent.click(screen.getByText("More controls")));
  expect(
    screen.getByLabelText("Gamma", { selector: "input[type=range]" })
  ).toHaveAttribute("min", "0.3");
  expect(
    screen.getByLabelText("Crop zoom", { selector: "input[type=range]" })
  ).toHaveAttribute("max", "6");
  await choose("Look", "Sketch");
  await choose("Dither", "Bayer");
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Rotate 90°" }))
  );
  await act(async () => upload());
  expect(mockConvert).toHaveBeenLastCalledWith(
    expect.objectContaining({
      look: "sketch",
      dither: "bayer",
      quarterTurns: 1
    })
  );
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Copy text" }))
  );
  expect(writeText).toHaveBeenCalledWith("[code]⣿⠀[/code]");
  fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
  expect(screen.getByRole("button", { name: "Copy text" })).toBeDisabled();
});
