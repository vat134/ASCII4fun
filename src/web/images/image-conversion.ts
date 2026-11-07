export type ImageConfiguration = {
  defaultOutputWidthInCells: number;
  minOutputWidthInCells: number;
  maxOutputWidthInCells: number;
  defaultCharacterRamp: string;
  defaultCharacterCellAspectRatio: number;
  maxEncodedBytes: number;
  requestToken: string;
  minToneAdjustment: number;
  maxToneAdjustment: number;
  maxPercentage: number;
  defaultMonochromeColor: RgbColor;
  defaultBackgroundColor: RgbColor;
};

export type RgbColor = { red: number; green: number; blue: number };

export type CharacterImageOptions = {
  outputWidthInCells: number;
  characterRamp: string;
  invert: boolean;
  sourceColors: boolean;
  contrast: number;
  brightness: number;
  shadowLift: number;
  sourcePhotoOpacity: number;
  monochromeColor: RgbColor;
  backgroundColor: RgbColor;
};

export type ImageConversionResult = {
  text: string;
  widthInCells: number;
  heightInCells: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
  widthInPixels: number;
  heightInPixels: number;
};

export function createDefaultImageOptions(
  configuration: ImageConfiguration
): CharacterImageOptions {
  return {
    outputWidthInCells: configuration.defaultOutputWidthInCells,
    characterRamp: configuration.defaultCharacterRamp,
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
