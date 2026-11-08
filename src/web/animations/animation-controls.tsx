import { AnimationFpsControl } from "./animation-fps-control";
import { VideoSoundControl } from "../videos/video-sound-control";
import { Button } from "../ui/base/button";
import { Slider } from "../ui/base/slider";
import type { useAnimationPlayback } from "./use-animation-playback";
import type { ImageConversionResult } from "../images/image-conversion";

export function AnimationControls({
  animation,
  playback,
  media
}: {
  animation: NonNullable<ImageConversionResult["animation"]>;
  playback: ReturnType<typeof useAnimationPlayback>;
  media?: { current: HTMLMediaElement } | undefined;
}) {
  const durationMs = animation.timeline.reduce(
    (sum, frame) => sum + frame.frameDurationMs,
    0
  );
  const elapsedMs = animation.timeline
    .slice(0, playback.frameIndex)
    .reduce((sum, frame) => sum + frame.frameDurationMs, 0);
  return (
    <div
      className="shrink-0 space-y-3 border-t px-4 py-3 sm:px-5"
      aria-label="Animation playback"
    >
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 min-w-20"
          onClick={playback.toggle}
        >
          {playback.playing ? "Pause" : "Play"}
        </Button>
        <span id="animation-position-label" className="sr-only">
          Animation position
        </span>
        <Slider
          aria-labelledby="animation-position-label"
          disabled={animation.timeline.length < 2}
          min={0}
          max={Math.max(1, animation.timeline.length - 1)}
          step={1}
          value={[playback.frameIndex]}
          onValueChange={(value) =>
            playback.seek(typeof value === "number" ? value : value[0]!)
          }
          className="flex-1"
        />
        <output className="font-mono text-xs tabular-nums">
          {(elapsedMs / 1000).toFixed(2)} / {(durationMs / 1000).toFixed(2)} s
        </output>
      </div>
      <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
        <label className="flex items-center gap-2">
          Speed
          <select
            aria-label="Playback speed"
            className="h-11 rounded-md border bg-background px-2"
            value={playback.options.speed}
            onChange={(event) =>
              playback.changeOptions({
                ...playback.options,
                speed: Number(event.target.value)
              })
            }
          >
            {[0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4].map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>
        <AnimationFpsControl
          sourceFramesPerSecond={animation.sourceFramesPerSecond}
          framesPerSecond={playback.options.framesPerSecond}
          onChange={(framesPerSecond) =>
            playback.changeOptions({ ...playback.options, framesPerSecond })
          }
        />
        <span>
          Frame {animation.frameIndex + 1} / {animation.timeline.length}
        </span>
        {media && <VideoSoundControl mediaRef={media} />}
      </div>
      {playback.error && (
        <p role="alert" className="text-xs text-destructive">
          {playback.error}
        </p>
      )}
    </div>
  );
}
