import type {
  AnimationFrameTiming,
  AnimationPlaybackOptions
} from "./animation-conversion";

/** Audio time is authoritative for video; GIF uses elapsed presentation time. */
export function startAnimationClock(
  timeline: AnimationFrameTiming[],
  iterations: number,
  options: AnimationPlaybackOptions,
  positionMs: { current: number },
  requestedFrame: { current: number },
  media: HTMLMediaElement | undefined,
  request: (index: number, options: AnimationPlaybackOptions) => void,
  stop: () => void,
  fail: (message: string) => void
) {
  let disposed = false;
  if (media) {
    media.playbackRate = options.speed;
    void media.play().catch(() => {
      if (!disposed) {
        fail("Sound could not start. Press Play to retry.");
        stop();
      }
    });
  }
  const durationMs = timeline.reduce(
    (sum, frame) => sum + frame.frameDurationMs,
    0
  );
  const start = performance.now() - positionMs.current;
  let handle = 0;
  function tick(now: number) {
    const elapsed = media
      ? (media.currentTime * 1000) / options.speed
      : now - start;
    positionMs.current = elapsed;
    const finished =
      media?.ended || (iterations > 0 && elapsed >= durationMs * iterations);
    let remaining = finished ? durationMs - 1 : elapsed % durationMs;
    let index = 0;
    while (
      index < timeline.length - 1 &&
      remaining >= timeline[index]!.frameDurationMs
    )
      remaining -= timeline[index++]!.frameDurationMs;
    if (index !== requestedFrame.current) {
      requestedFrame.current = index;
      request(index, options);
    }
    if (finished) stop();
    else handle = window.requestAnimationFrame(tick);
  }
  handle = window.requestAnimationFrame(tick);
  return () => {
    disposed = true;
    window.cancelAnimationFrame(handle);
    media?.pause();
  };
}
