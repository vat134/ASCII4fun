import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CopyTextButton } from "../../src/web/rendering/copy-text-button";

test("shows confirmation for 1.5 seconds after the latest successful copy", async () => {
  jest.useFakeTimers();
  const writeText = jest
    .fn<(text: string) => Promise<void>>()
    .mockResolvedValue();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText }
  });
  const view = render(<CopyTextButton text={" A \n B "} />);
  try {
    const button = screen.getByRole("button", { name: "Copy text" });
    await act(async () => fireEvent.click(button));
    expect(button).toHaveTextContent("Copied");
    act(() => jest.advanceTimersByTime(1000));
    await act(async () => fireEvent.click(button));
    act(() => jest.advanceTimersByTime(1499));
    expect(button).toHaveTextContent("Copied");
    act(() => jest.advanceTimersByTime(1));
    expect(button).toHaveTextContent("Copy text");
    expect(writeText).toHaveBeenNthCalledWith(2, " A \n B ");
  } finally {
    view.unmount();
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  }
});

test.each([false, true])(
  "ignores an obsolete copy completion (failure: %s)",
  async (fails) => {
    let resolveFirst!: () => void;
    let rejectFirst!: (error: Error) => void;
    let resolveSecond!: () => void;
    const writeText = jest
      .fn<(text: string) => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve, reject) => {
            resolveFirst = resolve;
            rejectFirst = reject;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
    const view = render(<CopyTextButton text="A" />);
    const button = screen.getByRole("button", { name: "Copy text" });
    fireEvent.click(button);
    view.rerender(<CopyTextButton text="B" />);
    fireEvent.click(button);
    await act(async () => resolveSecond());
    expect(button).toHaveTextContent("Copied");
    await act(async () => {
      if (fails) rejectFirst(new Error("Clipboard blocked"));
      else resolveFirst();
    });
    expect(button).toHaveTextContent("Copied");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  }
);
