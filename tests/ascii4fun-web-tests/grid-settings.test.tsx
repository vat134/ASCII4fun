import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { GridSettings } from "../../src/web/images/grid-settings";

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

function Columns() {
  const [width, setWidth] = useState(80);
  return (
    <GridSettings
      minWidthInCells={1}
      maxWidthInCells={500}
      widthInCells={width}
      onWidthChange={setWidth}
    />
  );
}

test("waits 1 second after the last typed digit and cancels cleared input", () => {
  const onChange = jest.fn();
  render(
    <GridSettings
      minWidthInCells={1}
      maxWidthInCells={500}
      widthInCells={80}
      onWidthChange={onChange}
    />
  );
  const input = screen.getByLabelText("Columns", {
    selector: 'input[type="text"]'
  });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "16" } });
  act(() => jest.advanceTimersByTime(500));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "160" } });
  act(() => jest.advanceTimersByTime(999));
  expect(onChange).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith(160);
  onChange.mockClear();
  fireEvent.change(input, { target: { value: "32" } });
  fireEvent.change(input, { target: { value: "" } });
  act(() => jest.advanceTimersByTime(1000));
  expect(onChange).not.toHaveBeenCalled();
});

test("commits typing on blur or Enter and steps immediately with the keyboard", () => {
  render(<Columns />);
  const input = screen.getByLabelText("Columns", {
    selector: 'input[type="text"]'
  });
  const slider = screen.getByLabelText("Columns", {
    selector: 'input[type="range"]'
  });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "160" } });
  expect(slider).toHaveValue("80");
  fireEvent.blur(input);
  expect(slider).toHaveValue("160");
  act(() => input.focus());
  fireEvent.change(input, { target: { value: "240" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(slider).toHaveValue("240");
  act(() => input.focus());
  fireEvent.keyDown(input, { key: "ArrowUp" });
  expect(slider).toHaveValue("241");
});

test("shortcuts apply immediately, round halves and stay within engine bounds", () => {
  render(<Columns />);
  const input = screen.getByLabelText("Columns", {
    selector: 'input[type="text"]'
  });
  for (const [button, expected] of [
    ["Double columns", "160"],
    ["Halve columns", "80"],
    ["Add 10 columns", "90"],
    ["Subtract 10 columns", "80"]
  ] as const) {
    fireEvent.click(screen.getByRole("button", { name: button }));
    expect(input).toHaveValue(expected);
  }
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "499" } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole("button", { name: "Halve columns" }));
  expect(input).toHaveValue("250");
  fireEvent.click(screen.getByRole("button", { name: "Double columns" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 10 columns" }));
  expect(input).toHaveValue("500");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "1" } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole("button", { name: "Halve columns" }));
  fireEvent.click(screen.getByRole("button", { name: "Subtract 10 columns" }));
  expect(input).toHaveValue("1");
});

test("delayed input uses current callbacks and is canceled on external width changes or unmount", () => {
  const first = jest.fn();
  const current = jest.fn();
  const { rerender, unmount } = render(
    <GridSettings
      minWidthInCells={1}
      maxWidthInCells={500}
      widthInCells={80}
      onWidthChange={first}
    />
  );
  const input = screen.getByLabelText("Columns", {
    selector: 'input[type="text"]'
  });
  fireEvent.change(input, { target: { value: "160" } });
  rerender(
    <GridSettings
      minWidthInCells={1}
      maxWidthInCells={500}
      widthInCells={80}
      onWidthChange={current}
    />
  );
  act(() => jest.advanceTimersByTime(1000));
  expect(first).not.toHaveBeenCalled();
  expect(current).toHaveBeenCalledTimes(1);
  expect(current).toHaveBeenCalledWith(160);
  current.mockClear();
  fireEvent.change(input, { target: { value: "240" } });
  rerender(
    <GridSettings
      minWidthInCells={1}
      maxWidthInCells={500}
      widthInCells={100}
      onWidthChange={current}
    />
  );
  act(() => jest.advanceTimersByTime(1000));
  expect(current).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "320" } });
  unmount();
  act(() => jest.advanceTimersByTime(1000));
  expect(current).not.toHaveBeenCalled();
});

test("a shortcut uses newly typed input before the parent has rendered its committed width", () => {
  const onChange = jest.fn();
  render(
    <GridSettings
      minWidthInCells={1}
      maxWidthInCells={500}
      widthInCells={240}
      onWidthChange={onChange}
    />
  );
  const input = screen.getByLabelText("Columns", {
    selector: 'input[type="text"]'
  });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "100" } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole("button", { name: "Double columns" }));
  expect(onChange.mock.calls).toEqual([[100], [200]]);
  act(() => jest.advanceTimersByTime(1000));
  expect(onChange).toHaveBeenCalledTimes(2);
});
