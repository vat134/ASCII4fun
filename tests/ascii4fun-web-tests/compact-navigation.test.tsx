import { beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ConversionWorkspace } from "../../src/web/workspace/conversion-workspace";
import {
  AsciiType as MockAsciiType,
  type WorkspaceMode
} from "../../src/web/workspace/ascii-type";
import { compactConfiguration } from "./compact-fixtures";
import type { ImageConfiguration } from "../../src/web/images/image-conversion";

jest.mock("../../src/web/images/image-workspace", () => ({
  ImageWorkspace: ({
    active,
    onModeChange
  }: {
    active: boolean;
    onModeChange: (mode: WorkspaceMode) => void;
  }) => (
    <>
      <MockAsciiType mode="media" onChange={onModeChange}>
        Media input
      </MockAsciiType>
      <output aria-label="Media active">{String(active)}</output>
    </>
  )
}));
jest.mock("../../src/web/figlet/text-workspace", () => ({
  TextWorkspace: ({
    onModeChange
  }: {
    onModeChange: (mode: WorkspaceMode) => void;
  }) => (
    <MockAsciiType mode="text" onChange={onModeChange}>
      Text input
    </MockAsciiType>
  )
}));
jest.mock("../../src/web/compact/compact-client", () => ({
  CompactArtClient: class {}
}));

beforeEach(() => {
  global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
    ok: true,
    json: async () => compactConfiguration
  } as Response);
});

test("opens three independent modes lazily, preserves Mini art settings and focuses the selected tab", async () => {
  render(
    <ConversionWorkspace
      configuration={{ maxEncodedBytes: 1000 } as ImageConfiguration}
    />
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Media active")).toHaveTextContent("true");
  fireEvent.click(screen.getByRole("tab", { name: "Mini art" }));
  await screen.findByRole("complementary", { name: "Mini art settings" });
  expect(
    screen.getByRole("tab", { name: "Mini art", selected: true })
  ).toHaveFocus();
  expect(screen.getByLabelText("Media active")).toHaveTextContent("false");
  fireEvent.click(screen.getByRole("switch", { name: "Invert" }));
  fireEvent.click(screen.getByRole("tab", { name: "Text" }));
  expect(
    screen.getByRole("tab", { name: "Text", selected: true })
  ).toHaveFocus();
  expect(screen.getByText("Text input")).toBeVisible();
  fireEvent.click(screen.getByRole("tab", { name: "Media" }));
  expect(screen.getByLabelText("Media active")).toHaveTextContent("true");
  fireEvent.click(screen.getByRole("tab", { name: "Mini art" }));
  expect(screen.getByRole("switch", { name: "Invert" })).toHaveAttribute(
    "aria-checked",
    "false"
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(within(screen.getByRole("tablist")).getAllByRole("tab")).toHaveLength(
    3
  );
});

test("keeps navigation usable after configuration failure and retries the actual request", async () => {
  jest.mocked(fetch).mockRejectedValueOnce(new Error("Connection lost"));
  render(
    <ConversionWorkspace
      configuration={{ maxEncodedBytes: 1000 } as ImageConfiguration}
    />
  );
  fireEvent.click(screen.getByRole("tab", { name: "Mini art" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Retry connection" }))
  );
  expect(
    await screen.findByRole("complementary", { name: "Mini art settings" })
  ).toBeVisible();
});
