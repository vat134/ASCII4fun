import { beforeEach, afterEach, expect, jest, test } from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen
} from "@testing-library/react";
import { ImageWorkspace } from "../../src/web/images/image-workspace";
import { useImageConversion } from "../../src/web/images/use-image-conversion";
import type { ImageConfiguration } from "../../src/web/images/image-conversion";

const configuration: ImageConfiguration = {
  defaultOutputWidthInCells: 80,
  minOutputWidthInCells: 1,
  maxOutputWidthInCells: 500,
  defaultCharacterRamp: "@%#*+=-:. ",
  defaultCharacterCellAspectRatio: 0.5,
  maxEncodedBytes: 1024,
  requestToken: "test-token"
};
const fetchMock = jest.fn<typeof fetch>();

beforeEach(() => {
  jest.useFakeTimers();
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
  URL.createObjectURL = jest.fn(() => "blob:test-image");
  URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

test("exposes current controls and explicitly disables future inputs", () => {
  render(<ImageWorkspace configuration={configuration} />);
  expect(screen.getByRole("tab", { name: /Text/ })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
  expect(screen.getByRole("tab", { name: /Media/ })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  expect(screen.getByRole("textbox", { name: "Media URL" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Download .txt" })).toBeDisabled();
  expect(screen.getByRole("switch", { name: "Source colors" })).toBeChecked();
  // jsdom has no layout; Base UI reveals the thumbs after browser measurement.
  expect(
    screen.getByLabelText("Columns", { selector: 'input[type="range"]' })
  ).toHaveValue("80");
  expect(screen.getByLabelText("Preview zoom level")).toHaveTextContent("100%");
  expect(screen.queryByRole("textbox", { name: "Characters" })).toBeNull();
  expect(
    screen.getByLabelText("Characters", { selector: "p" })
  ).toHaveTextContent("@%#*+=-:.");
});

test("exports the displayed PNG, blocks stale exports and keeps zoom local", async () => {
  const response = {
    text: "@ ",
    widthInCells: 2,
    heightInCells: 1,
    png: "current-png"
  };
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => response
  } as Response);
  const downloads: { href: string; name: string }[] = [];
  const click = jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ href: this.href, name: this.download });
    });
  render(<ImageWorkspace configuration={configuration} />);
  fireEvent.change(screen.getByLabelText("Upload image"), {
    target: { files: [new File(["image"], "source.png")] }
  });
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  const body = fetchMock.mock.calls[0]![1]!.body as FormData;
  expect(body.get("sourceColors")).toBe("true");
  expect(screen.getByRole("img", { name: /ASCII preview/ })).toHaveAttribute(
    "src",
    "data:image/png;base64,current-png"
  );
  fireEvent.click(screen.getByRole("switch", { name: "Source colors" }));
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Download .txt" })).toBeDisabled();
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(
    (fetchMock.mock.calls[1]![1]!.body as FormData).get("sourceColors")
  ).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByLabelText("Preview zoom level")).toHaveTextContent("125%");
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Download PNG" }));
  expect(downloads).toEqual([
    { href: "data:image/png;base64,current-png", name: "source.png" }
  ]);
  fireEvent.click(screen.getByRole("button", { name: "Download .txt" }));
  expect(downloads[1]?.name).toBe("source.txt");
  fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
  expect(screen.getByRole("switch", { name: "Source colors" })).toBeChecked();
  click.mockRestore();
});

test("rejects excessive local input without submitting conversion", () => {
  const { result } = renderHook(() => useImageConversion(configuration));
  act(() =>
    result.current.selectImage(new File([new Uint8Array(1025)], "large.png"))
  );
  expect(result.current.state.status).toBe("error");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("aborts obsolete work and ignores a stale response even if it resolves", async () => {
  let finishFirst!: (response: Response) => void;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishFirst = resolve;
      })
  );
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ text: "NEW", widthInCells: 3, heightInCells: 1 })
  } as Response);
  const { result, unmount } = renderHook(() =>
    useImageConversion(configuration)
  );
  act(() => result.current.selectImage(new File(["image"], "source.png")));
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  const firstSignal = fetchMock.mock.calls[0]?.[1]?.signal;
  act(() =>
    result.current.changeOptions({
      ...result.current.options,
      outputWidthInCells: 3
    })
  );
  expect(firstSignal?.aborted).toBe(true);
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(result.current.state).toEqual({
    status: "ready",
    result: { text: "NEW", widthInCells: 3, heightInCells: 1 }
  });
  await act(async () => {
    finishFirst({
      ok: true,
      json: async () => ({ text: "OLD", widthInCells: 3, heightInCells: 1 })
    } as Response);
  });
  expect(result.current.state).toEqual({
    status: "ready",
    result: { text: "NEW", widthInCells: 3, heightInCells: 1 }
  });
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-image");
});

test("shows a conversion failure and retries without losing the selected image", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: false,
    json: async () => ({
      title: "Image cannot be converted",
      detail: "Unreadable image."
    })
  } as Response);
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ text: "@ ", widthInCells: 2, heightInCells: 1 })
  } as Response);
  render(<ImageWorkspace configuration={configuration} />);
  fireEvent.change(screen.getByLabelText("Upload image"), {
    target: { files: [new File(["image"], "source.png")] }
  });
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Unreadable image.");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await act(async () => {
    jest.advanceTimersByTime(200);
  });
  expect(screen.getByRole("button", { name: "Download PNG" })).toBeEnabled();
  expect(
    screen.getByRole("img", { name: /ASCII preview/ })
  ).toBeInTheDocument();
});
