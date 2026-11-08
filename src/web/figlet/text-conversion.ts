import type { AsciiPreviewResult } from "../rendering/ascii-preview-result";

export const fontSampleText = "ASCII Text";
export const defaultTextColor = "#ffffff";
export const maxFontPreviews = 32;

export type TextFont = {
  id: string;
  name: string;
  category: string;
  hasNativeColors?: boolean;
  note?: string | null;
  palette?: string[];
  preview: AsciiPreviewResult | null;
  previewError?: string | undefined;
};
export type FontColorReplacements = Record<string, string>;
export type PendingTextConversion = {
  text: string;
  fontId: string;
  foregroundColor: string;
  colorReplacements: FontColorReplacements;
  version: number;
};
export type TextCommand =
  | { type: "fonts" }
  | { type: "font-preview"; fontId: string }
  | { type: "font-palette"; fontId: string }
  | {
      type: "convert-text";
      text: string;
      fontId: string;
      foregroundColor: string;
      colorReplacements: FontColorReplacements;
    };
export type TextRequest = TextCommand & { id: number };

export type TextPreviewState =
  | { status: "empty" | "pending" }
  | { status: "ready"; result: AsciiPreviewResult }
  | { status: "error"; message: string };
