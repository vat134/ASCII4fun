import { Slider } from "../ui/base/slider";

export function AnimationFpsControl({
  sourceFramesPerSecond,
  framesPerSecond,
  onChange
}: {
  sourceFramesPerSecond: number;
  framesPerSecond: number | null;
  onChange: (framesPerSecond: number | null) => void;
}) {
  // The last stop represents the untouched source, including irregular delays.
  const originalStop = Math.max(2, Math.ceil(sourceFramesPerSecond));
  const label =
    framesPerSecond === null
      ? `${Number(sourceFramesPerSecond.toFixed(2))} FPS · Original`
      : `${framesPerSecond} FPS`;
  return (
    <div className="min-w-0 flex-1 basis-48">
      <div className="flex items-center justify-between gap-3">
        <label id="animation-fps-label">FPS</label>
        <output id="animation-fps-value" className="tabular-nums">
          {label}
        </output>
      </div>
      <Slider
        aria-labelledby="animation-fps-label"
        ariaValueText={label}
        min={1}
        max={originalStop}
        step={1}
        disabled={sourceFramesPerSecond <= 1}
        value={[framesPerSecond ?? originalStop]}
        onValueChange={(value) => {
          const fps = typeof value === "number" ? value : value[0]!;
          onChange(fps === originalStop ? null : fps);
        }}
      />
    </div>
  );
}
