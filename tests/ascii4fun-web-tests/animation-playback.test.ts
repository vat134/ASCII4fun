import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { useAnimationPlayback } from "../../src/web/animations/use-animation-playback";
import type { AnimationPlaybackOptions } from "../../src/web/animations/animation-conversion";

const animation = {
  sourceFramesPerSecond: 10,
  frameIndex: 0,
  iterations: 2,
  timeline: [0, 1, 2].map((sourceFrameIndex) => ({
    sourceFrameIndex,
    frameDurationMs: 100
  }))
};
let clock: FrameRequestCallback | undefined;
const request =
  jest.fn<(frame: number, options: AnimationPlaybackOptions) => void>();
beforeEach(() => {
  request.mockClear();
  clock = undefined;
  jest.spyOn(performance, "now").mockReturnValue(0);
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    clock = callback;
    return 1;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    clock = undefined;
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});

test("skips late frames by source time and stops after the finite play count", () => {
  const { result } = renderHook(() => useAnimationPlayback(animation, request));
  act(() => clock!(250));
  expect(request).toHaveBeenLastCalledWith(2, {
    speed: 1,
    framesPerSecond: null
  });
  act(() => clock!(350));
  expect(request).toHaveBeenLastCalledWith(0, {
    speed: 1,
    framesPerSecond: null
  });
  act(() => clock!(610));
  expect(result.current.playing).toBe(false);
  expect(request).toHaveBeenLastCalledWith(2, {
    speed: 1,
    framesPerSecond: null
  });
  act(() => result.current.toggle());
  expect(result.current.playing).toBe(true);
  expect(request).toHaveBeenLastCalledWith(0, {
    speed: 1,
    framesPerSecond: null
  });
});

test("seeks while paused, applies cadence and resets options for a new source", () => {
  const { result } = renderHook(() => useAnimationPlayback(animation, request));
  act(() => result.current.toggle());
  act(() => result.current.seek(1));
  expect(result.current.frameIndex).toBe(1);
  act(() => result.current.seek(2));
  expect(result.current.frameIndex).toBe(2);
  expect(result.current.playing).toBe(false);
  expect(request).toHaveBeenLastCalledWith(2, {
    speed: 1,
    framesPerSecond: null
  });
  act(() => result.current.changeOptions({ speed: 2, framesPerSecond: 5 }));
  expect(request).toHaveBeenLastCalledWith(0, {
    speed: 2,
    framesPerSecond: 5
  });
  act(() => result.current.reset());
  expect(result.current.options).toEqual({ speed: 1, framesPerSecond: null });
  expect(result.current.currentFrame()).toBe(0);
});

test("suspends the clock while the Media workspace is hidden", () => {
  const { rerender } = renderHook(
    ({ active }) => useAnimationPlayback(animation, request, active),
    { initialProps: { active: true } }
  );
  act(() => clock!(150));
  rerender({ active: false });
  expect(clock).toBeUndefined();
  const calls = request.mock.calls.length;
  rerender({ active: true });
  act(() => clock!(1));
  expect(request).toHaveBeenCalledTimes(calls);
});

test("keeps elapsed playback time when live settings replace the frame callback", () => {
  const nextRequest = jest.fn<typeof request>();
  const { result, rerender } = renderHook(
    ({ callback }) => useAnimationPlayback(animation, callback),
    { initialProps: { callback: request } }
  );
  act(() => clock!(50));
  jest.mocked(performance.now).mockReturnValue(100);
  rerender({ callback: nextRequest });
  act(() => clock!(125));
  expect(result.current.playing).toBe(true);
  expect(nextRequest).toHaveBeenLastCalledWith(1, {
    speed: 1,
    framesPerSecond: null
  });
  expect(request).not.toHaveBeenCalled();
});

test("video follows the audio clock and live settings do not restart sound", () => {
  const play = jest.fn<() => Promise<void>>().mockResolvedValue();
  const pause = jest.fn();
  const mediaRef = {
    current: {
      currentTime: 0.15,
      ended: false,
      playbackRate: 1,
      play,
      pause
    } as unknown as HTMLMediaElement
  };
  const nextRequest = jest.fn<typeof request>();
  const { result, rerender } = renderHook(
    ({ callback }) => useAnimationPlayback(animation, callback, true, mediaRef),
    { initialProps: { callback: request } }
  );
  act(() => clock!(10000));
  expect(request).toHaveBeenLastCalledWith(1, {
    speed: 1,
    framesPerSecond: null
  });
  rerender({ callback: nextRequest });
  expect(play).toHaveBeenCalledTimes(1);
  expect(pause).not.toHaveBeenCalled();
  act(() => result.current.toggle());
  expect(pause).toHaveBeenCalledTimes(1);
  act(() => result.current.seek(2));
  expect(mediaRef.current.currentTime).toBe(0.2);
  expect(result.current.playing).toBe(false);
});

test("reports blocked sound and returns to paused playback", async () => {
  const mediaRef = {
    current: {
      play: jest
        .fn<() => Promise<void>>()
        .mockRejectedValue(new Error("blocked")),
      pause: jest.fn()
    } as unknown as HTMLMediaElement
  };
  const { result } = renderHook(() =>
    useAnimationPlayback(animation, request, true, mediaRef)
  );
  await act(async () => {});
  expect(result.current.playing).toBe(false);
  expect(result.current.error).toContain("Press Play");
});
