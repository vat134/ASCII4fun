import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { CompactColumns } from "../../src/web/compact/compact-columns";

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

function Columns() {
  const [columns, setColumns] = useState(0);
  return (
    <>
      <CompactColumns
        columns={columns}
        resolvedColumns={25}
        onChange={setColumns}
      />
      <output aria-label="Committed columns">{columns}</output>
    </>
  );
}

test("accepts transient digits before committing the complete bounded width after one second", () => {
  render(<Columns />);
  const input = screen.getByRole("textbox", { name: "Mini art columns" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "2" } });
  expect(input).toHaveValue("2");
  fireEvent.change(input, { target: { value: "25" } });
  act(() => jest.advanceTimersByTime(999));
  expect(screen.getByLabelText("Committed columns")).toHaveTextContent("0");
  act(() => jest.advanceTimersByTime(1));
  expect(screen.getByLabelText("Committed columns")).toHaveTextContent("25");
  fireEvent.change(input, { target: { value: "999" } });
  fireEvent.blur(input);
  expect(screen.getByLabelText("Committed columns")).toHaveTextContent("200");
});

test("Auto cancels a pending manual width and clears the input", () => {
  render(<Columns />);
  const input = screen.getByRole("textbox", { name: "Mini art columns" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "25" } });
  fireEvent.click(screen.getByRole("button", { name: "Auto" }));
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.getByLabelText("Committed columns")).toHaveTextContent("0");
  expect(screen.getByRole("textbox", { name: "Mini art columns" })).toHaveValue(
    "25"
  );
});

test("steps from the resolved Auto size and restores Auto without changing it on focus", () => {
  render(<Columns />);
  const input = screen.getByRole("textbox", { name: "Mini art columns" });
  expect(input).toHaveValue("25");
  fireEvent.focus(input);
  fireEvent.blur(input);
  expect(screen.getByLabelText("Committed columns")).toHaveTextContent("0");
  fireEvent.click(
    screen.getByRole("button", { name: "Decrease mini art columns" })
  );
  expect(screen.getByLabelText("Committed columns")).toHaveTextContent("24");
  fireEvent.click(
    screen.getByRole("button", { name: "Increase mini art columns" })
  );
  expect(screen.getByLabelText("Committed columns")).toHaveTextContent("25");
  expect(screen.getByRole("button", { name: "Auto" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
  fireEvent.click(screen.getByRole("button", { name: "Auto" }));
  expect(screen.getByLabelText("Committed columns")).toHaveTextContent("0");
  expect(input).toHaveValue("25");
});
