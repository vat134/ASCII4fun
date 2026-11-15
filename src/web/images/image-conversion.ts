import type { AsciiPreviewResult } from "../rendering/ascii-preview-result";
import type { AnimationFrameTiming } from "../animations/animation-conversion";
import type { components } from "../api/generated/http-api";

export type ImageConfiguration = components["schemas"]["ImageConfiguration"];

export type RgbColor = components["schemas"]["RgbColor"];

export type CharacterImageOptions = {
  outputWidthInCells: number;
  characterRamp: string;
  useMeasuredGlyphDensity: boolean;
  usePhotoStyle: boolean;
  invert: boolean;
  sourceColors: boolean;
  contrast: number;
  brightness: number;
  shadowLift: number;
  sourcePhotoOpacity: number;
  monochromeColor: RgbColor;
  backgroundColor: RgbColor;
};

export type ImageConversionResult = AsciiPreviewResult & {
  animation?: {
    sourceFramesPerSecond: number;
    timeline: AnimationFrameTiming[];
    iterations: number;
    frameIndex: number;
  };
};

export function createDefaultImageOptions(
  configuration: ImageConfiguration
): CharacterImageOptions {
  return {
    outputWidthInCells: configuration.defaultOutputWidthInCells,
    characterRamp: configuration.defaultCharacterRamp,
    useMeasuredGlyphDensity: true,
    usePhotoStyle: false,
    invert: true,
    sourceColors: true,
    contrast: 0,
    brightness: 0,
    shadowLift: 0,
    sourcePhotoOpacity: 0,
    monochromeColor: configuration.defaultMonochromeColor,
    backgroundColor: configuration.defaultBackgroundColor
  };
}

export async function loadImageConfiguration(
  signal: AbortSignal
): Promise<ImageConfiguration> {
  const response = await fetch("/api/images/options", { signal });
  if (!response.ok) {
    throw new Error(
      "Cannot connect to the conversion server. Check that it is running, then retry."
    );
  }
  return response.json() as Promise<ImageConfiguration>;
}
