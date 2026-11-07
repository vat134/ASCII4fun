import type { CharacterImageOptions } from "../image-conversion";

export type BrowserEngine = {
  Limits(): number[];
  SrgbProfile(): Uint8Array;
  CmykProfile(): Uint8Array;
  Geometry(): number[];
  FontNames(ramp: string): string[];
  ValidateSource(bytes: Uint8Array): void;
  Height(width: number, height: number, columns: number): number;
  Convert(
    rgba: Uint8Array,
    width: number,
    height: number,
    options: string
  ): string;
  Rasterize(): Uint8Array;
};

export type WorkerRequest =
  | { id: number; type: "load"; bytes: Uint8Array }
  | { id: number; type: "convert"; options: CharacterImageOptions };
