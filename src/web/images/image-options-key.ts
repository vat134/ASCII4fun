import type { CharacterImageOptions } from "./image-conversion";

export function imageOptionsKey(options: CharacterImageOptions): string {
  return JSON.stringify({
    outputWidthInCells: options.outputWidthInCells,
    characterRamp: options.characterRamp,
    invert: options.invert,
    sourceColors: options.sourceColors,
    contrast: options.contrast,
    brightness: options.brightness,
    shadowLift: options.shadowLift,
    sourcePhotoOpacity: options.sourcePhotoOpacity,
    monochromeColor: options.monochromeColor,
    backgroundColor: options.backgroundColor
  } satisfies CharacterImageOptions);
}
