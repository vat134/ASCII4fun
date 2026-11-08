export type AnimationMetadata = {
  frameDurationsMs: number[];
  iterations: number;
};

export type AnimationPlaybackOptions = {
  speed: number;
  framesPerSecond: number | null;
};

export type AnimationFrameTiming = {
  sourceFrameIndex: number;
  frameDurationMs: number;
};
