import type {
  CompactArtOptions,
  CompactConfiguration,
  CompactPreviewResult
} from "../../src/web/compact/compact-types";

export const compactOptions: CompactArtOptions = {
  destination: "steamc",
  columns: 0,
  cropAspectRatio: 1,
  cropX: 0.5,
  cropY: 0.5,
  cropZoom: 1,
  quarterTurns: 0,
  look: "photo",
  dither: "atkinson",
  invert: true,
  autoLevels: true,
  brightness: 0,
  contrast: 0,
  gamma: 1,
  detail: 0.35,
  edges: 0
};

export const compactConfiguration: CompactConfiguration = {
  defaultOptions: compactOptions,
  destinations: [
    ["steamc", "Steam", "Comment"],
    ["steamp", "Steam", "Summary"],
    ["steamb", "Steam", "Info box"],
    ["tg", "Telegram", "Message"],
    ["twitch", "Twitch", "Chat"],
    ["plain", "File", "File"]
  ].map(([id, platform, name]) => ({
    id: id!,
    platform: platform!,
    name: name!,
    limit: 1000,
    unit: "characters",
    recommendedColumns: 24,
    cellAspectRatio: 0.5,
    flow: platform === "Twitch"
  }))
};

export const compactArtwork: CompactPreviewResult = {
  text: "⣿⠀\n⠀⣿",
  widthInCells: 2,
  heightInCells: 2,
  widthInPixels: 4,
  heightInPixels: 8,
  pixels: new Uint8ClampedArray(4 * 8 * 4),
  destinationCounts: {
    steamc: 13,
    steamp: 13,
    steamb: 13,
    tg: 5,
    twitch: 8,
    plain: 5
  },
  lookPreviews: {
    photo: "⣿⠀\n⠀⣿",
    texture: "⠃⠀\n⠀⠃",
    sketch: "⠁⠀\n⠀⠁",
    soft: "⣿⠀\n⠀⣿",
    poster: "⣿⠀\n⠀⣿"
  },
  payload: {
    text: "⣿⠀\n⠀⣿",
    count: 5,
    limit: 1000,
    unit: "characters",
    fits: true,
    recommendedColumns: 24,
    warnings: []
  }
};
