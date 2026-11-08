import { expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AnimationFpsControl } from "../../src/web/animations/animation-fps-control";

test("uses the original cadence at the top and permits only lower integer FPS", async () => {
  const onChange = jest.fn();
  const { rerender } = render(
    <AnimationFpsControl
      sourceFramesPerSecond={1000 / 70}
      framesPerSecond={null}
      onChange={onChange}
    />
  );
  await act(async () => {});
  const slider = screen.getByLabelText("FPS", {
    selector: 'input[type="range"]'
  });
  expect(slider).toHaveAttribute("aria-valuetext", "14.29 FPS · Original");
  fireEvent.change(slider, { target: { value: "14" } });
  expect(onChange).toHaveBeenLastCalledWith(14);
  rerender(
    <AnimationFpsControl
      sourceFramesPerSecond={1000 / 70}
      framesPerSecond={14}
      onChange={onChange}
    />
  );
  fireEvent.change(slider, { target: { value: "15" } });
  expect(onChange).toHaveBeenLastCalledWith(null);
});

test("shows the requested FPS and disables reduction for a source below one FPS", async () => {
  const onChange = jest.fn();
  const { rerender } = render(
    <AnimationFpsControl
      sourceFramesPerSecond={10}
      framesPerSecond={5}
      onChange={onChange}
    />
  );
  await act(async () => {});
  expect(
    screen.getByLabelText("FPS", { selector: 'input[type="range"]' })
  ).toHaveAttribute("aria-valuetext", "5 FPS");
  rerender(
    <AnimationFpsControl
      sourceFramesPerSecond={0.5}
      framesPerSecond={null}
      onChange={onChange}
    />
  );
  await act(async () => {});
  expect(
    screen.getByLabelText("FPS", { selector: 'input[type="range"]' })
  ).toBeDisabled();
  expect(
    screen.getByLabelText("FPS", { selector: 'input[type="range"]' })
  ).toHaveAttribute("aria-valuetext", "0.5 FPS · Original");
});
