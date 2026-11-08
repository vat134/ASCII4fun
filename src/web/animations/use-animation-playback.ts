import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState
} from "react";
import type { ImageConversionResult } from "../images/image-conversion";
import type { AnimationPlaybackOptions } from "./animation-conversion";
import { startAnimationClock } from "./start-animation-clock";
import type { AnimationFrameTiming } from "./animation-conversion";

export function useAnimationPlayback(
  animation: ImageConversionResult["animation"],
  request: (frame: number, options: AnimationPlaybackOptions) => void,
  active = true,
  mediaRef?: { current: HTMLMediaElement }
) {
  const [options, setOptions] = useState<AnimationPlaybackOptions>({
    speed: 1,
    framesPerSecond: null
  });
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [seekRevision, setSeekRevision] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const positionMs = useRef(0);
  const requestedFrame = useRef(0);
  const timelineKey = JSON.stringify(animation?.timeline ?? []);
  const timeline = useMemo(
    () => JSON.parse(timelineKey) as AnimationFrameTiming[],
    [timelineKey]
  );
  const iterations = animation?.iterations ?? 0;
  const requestPlaybackFrame = useEffectEvent(
    (index: number, playback: AnimationPlaybackOptions) => {
      setFrameIndex(index);
      request(index, playback);
    }
  );

  useEffect(() => {
    const mediaRef = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (mediaRef.matches) setPlaying(false);
    };
    mediaRef.addEventListener("change", reduce);
    return () => mediaRef.removeEventListener("change", reduce);
  }, []);

  useEffect(() => {
    if (!timeline.length || !playing || !active) return;
    return startAnimationClock(
      timeline,
      iterations,
      options,
      positionMs,
      requestedFrame,
      mediaRef?.current,
      requestPlaybackFrame,
      () => setPlaying(false),
      setError
    );
  }, [timeline, iterations, playing, seekRevision, options, active, mediaRef]);

  const seek = useCallback(
    (index: number) => {
      if (!animation) return;
      requestedFrame.current = index;
      setFrameIndex(index);
      positionMs.current = animation.timeline
        .slice(0, index)
        .reduce((sum, frame) => sum + frame.frameDurationMs, 0);
      if (mediaRef)
        mediaRef.current.currentTime =
          (positionMs.current * options.speed) / 1000;
      setSeekRevision((value) => value + 1);
      request(index, options);
    },
    [animation, request, options, mediaRef]
  );

  function changeOptions(next: AnimationPlaybackOptions) {
    setOptions(next);
    positionMs.current = 0;
    requestedFrame.current = 0;
    setFrameIndex(0);
    if (mediaRef) mediaRef.current.currentTime = 0;
    request(0, next);
  }

  return {
    options,
    playing,
    error,
    frameIndex,
    seek,
    changeOptions,
    currentFrame: () => requestedFrame.current,
    reset: (
      autoplay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) => {
      setOptions({ speed: 1, framesPerSecond: null });
      positionMs.current = 0;
      requestedFrame.current = 0;
      setFrameIndex(0);
      setPlaying(autoplay);
      setError(null);
    },
    toggle: () => {
      setError(null);
      if (
        !playing &&
        animation &&
        iterations > 0 &&
        positionMs.current >=
          animation.timeline.reduce(
            (sum, frame) => sum + frame.frameDurationMs,
            0
          ) *
            iterations
      )
        seek(0);
      setPlaying((value) => !value);
    }
  };
}
