import { beforeEach, expect, jest, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import type {
  CompactArtOptions,
  CompactPreviewResult
} from "../../src/web/compact/compact-types";
import { useCompactConversion } from "../../src/web/compact/use-compact-conversion";
import { compactArtwork, compactOptions } from "./compact-fixtures";

const mockConvert =
  jest.fn<(options: CompactArtOptions) => Promise<CompactPreviewResult>>();
const mockDispose = jest.fn();
jest.mock("../../src/web/compact/compact-client", () => ({
  CompactArtClient: class {
    convert = (options: CompactArtOptions) => mockConvert(options);
    dispose = mockDispose;
  }
}));

beforeEach(() => {
  mockConvert.mockReset().mockResolvedValue(compactArtwork);
  mockDispose.mockClear();
  URL.createObjectURL = jest.fn(() => "blob:compact");
  URL.revokeObjectURL = jest.fn();
});

test("coalesces rapid changes, never exposes obsolete results and keeps only the latest exportable intent", async () => {
  let finish!: (result: CompactPreviewResult) => void;
  mockConvert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const { result } = renderHook(() =>
    useCompactConversion(compactOptions, 1000, true)
  );
  act(() => result.current.selectFile(new File(["first"], "first.png")));
  act(() =>
    result.current.changeOptions({ ...compactOptions, brightness: 0.1 })
  );
  act(() =>
    result.current.changeOptions({ ...compactOptions, brightness: 0.9 })
  );
  expect(mockConvert).toHaveBeenCalledTimes(1);
  expect(result.current.state.status).toBe("pending");
  await act(async () => finish({ ...compactArtwork, text: "obsolete" }));
  expect(mockConvert).toHaveBeenCalledTimes(2);
  expect(mockConvert).toHaveBeenLastCalledWith({
    ...compactOptions,
    brightness: 0.9
  });
  expect(result.current.state).toMatchObject({
    status: "ready",
    result: compactArtwork
  });
});

test("invalidates a ready result during changes and ignores a replaced source completion", async () => {
  const { result } = renderHook(() =>
    useCompactConversion(compactOptions, 1000, true)
  );
  await act(async () =>
    result.current.selectFile(new File(["first"], "first.png"))
  );
  expect(result.current.state.status).toBe("ready");
  let finish!: (result: CompactPreviewResult) => void;
  mockConvert.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  act(() => result.current.changeOptions({ ...compactOptions, contrast: 0.5 }));
  expect(result.current.state.status).toBe("pending");
  await act(async () =>
    result.current.selectFile(new File(["second"], "second.png"))
  );
  await act(async () => finish({ ...compactArtwork, text: "obsolete" }));
  expect(result.current.state).toMatchObject({
    status: "ready",
    result: compactArtwork
  });
  expect(mockDispose).toHaveBeenCalled();
});

test("retries worker failure, clears output while preserving options and releases the source", async () => {
  mockConvert.mockRejectedValueOnce(new Error("Unreadable photo"));
  const { result } = renderHook(() =>
    useCompactConversion(compactOptions, 1000, true)
  );
  await act(async () =>
    result.current.selectFile(new File(["bad"], "bad.png"))
  );
  expect(result.current.state.error).toBe("Unreadable photo");
  await act(async () => result.current.retry());
  expect(result.current.state.status).toBe("ready");
  await act(async () =>
    result.current.changeOptions({ ...compactOptions, columns: 40 })
  );
  act(() => result.current.clear());
  expect(result.current.state).toMatchObject({ status: "idle", result: null });
  expect(result.current.options.columns).toBe(40);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:compact");
});

test("rejects oversized input without starting a worker and preserves settings while inactive", async () => {
  const { result, rerender } = renderHook(
    ({ active }) => useCompactConversion(compactOptions, 10, active),
    { initialProps: { active: true } }
  );
  act(() =>
    result.current.selectFile(new File([new Uint8Array(11)], "large.png"))
  );
  expect(mockConvert).not.toHaveBeenCalled();
  expect(result.current.state.status).toBe("error");
  await act(async () => result.current.selectFile(new File(["ok"], "ok.png")));
  rerender({ active: false });
  expect(mockDispose).toHaveBeenCalled();
  act(() => result.current.changeOptions({ ...compactOptions, columns: 40 }));
  await act(async () => rerender({ active: true }));
  expect(mockConvert).toHaveBeenLastCalledWith({
    ...compactOptions,
    columns: 40
  });
});
