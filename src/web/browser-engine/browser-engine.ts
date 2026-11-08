import type { CharacterImageOptions } from "../images/image-conversion";
import type { AnimationPlaybackOptions } from "../animations/animation-conversion";

export const browserEngineTimeoutMs = 30_000;

export type BrowserEngine = {
  Limits(): [number, number, number];
  SrgbProfile(): Uint8Array;
  CmykProfile(): Uint8Array;
  Geometry(): [number, number];
  PhotoByteLength(widthInCells: number, heightInCells: number): number;
  SetSourcePhoto(
    rgba: Uint8Array,
    widthInCells: number,
    heightInCells: number
  ): void;
  FontNames(ramp: string): string[];
  ValidateSource(bytes: Uint8Array): void;
  IsGif(bytes: Uint8Array): boolean;
  ValidateAnimationSource(width: number, height: number, count: number): void;
  AnalyzeAnimationFrame(
    rgba: Uint8Array,
    width: number,
    height: number
  ): [number, number];
  SetAnimationRange(minimum: number, maximum: number): void;
  AnimationTiming(durationsJson: string, speed: number, fps: number): string;
  SourceFramesPerSecond(durationsJson: string): number;
  VideoTiming(
    frameCount: number,
    durationMs: number,
    speed: number,
    fps: number
  ): string;
  Height(width: number, height: number, columns: number): number;
  Convert(
    rgba: Uint8Array,
    width: number,
    height: number,
    options: string
  ): string;
  Rasterize(): Uint8Array;
  TextFonts(): string;
  TextFontPalette(fontId: string): string;
  ConvertText(
    text: string,
    fontId: string,
    foregroundColor: string,
    colorReplacements: string
  ): string;
};

export type WorkerRequest =
  | { id: number; type: "load"; bytes: Uint8Array }
  | {
      id: number;
      type: "video-timing";
      frameCount: number;
      durationMs: number;
      playback: AnimationPlaybackOptions;
    }
  | {
      id: number;
      type: "video-frame";
      bytes: Uint8Array;
      width: number;
      height: number;
      options: CharacterImageOptions;
    }
  | {
      id: number;
      type: "convert";
      options: CharacterImageOptions;
      frameIndex?: number;
      playback?: AnimationPlaybackOptions;
    };
