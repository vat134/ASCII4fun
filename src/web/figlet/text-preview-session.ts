import { TextFontPreviews } from "./text-font-previews";
import { BrowserTextClient } from "./browser-text-client";
import type { AsciiPreviewResult } from "../rendering/ascii-preview-result";
import {
  defaultTextColor,
  type TextFont,
  type FontColorReplacements,
  type PendingTextConversion,
  type TextPreviewState
} from "./text-conversion";

/** One active conversion and one replaceable edit; old results never replace new text. */
export class TextPreviewSession {
  private readonly client = new BrowserTextClient();
  private pending: PendingTextConversion | null = null;
  private readonly palettes = new Map<string, string[]>();
  private version = 0;
  private running = false;
  private disposed = false;
  private defaultFontId: string | null = null;
  private startupError: string | null = null;
  private readonly thumbnails: TextFontPreviews;

  constructor(
    private readonly onState: (state: TextPreviewState) => void,
    onFonts: (fonts: TextFont[]) => void,
    onThumbnail: (
      id: string,
      preview: AsciiPreviewResult | null,
      error?: string
    ) => void = () => {},
    private readonly onPalette: (
      id: string,
      palette: string[]
    ) => void = () => {}
  ) {
    this.thumbnails = new TextFontPreviews(onThumbnail);
    this.client
      .fonts()
      .then((fonts) => {
        if (this.disposed) return;
        if (!fonts[0]) throw new Error("No text fonts are available.");
        this.defaultFontId = fonts[0].id;
        onFonts(fonts);
        void this.convertPending();
      })
      .catch((error: unknown) => {
        if (!this.disposed) {
          this.startupError =
            error instanceof Error
              ? error.message
              : "Cannot open the text engine.";
          this.onState({
            status: "error",
            message: this.startupError
          });
        }
      });
  }

  request(
    text: string,
    fontId: string,
    foregroundColor = defaultTextColor,
    colorReplacements: FontColorReplacements = {}
  ) {
    if (this.disposed) return;
    this.pending = {
      text,
      fontId,
      foregroundColor,
      colorReplacements,
      version: ++this.version
    };
    if (this.startupError) {
      this.onState({ status: "error", message: this.startupError });
      return;
    }
    this.onState({ status: text.trim() ? "pending" : "empty" });
    void this.convertPending();
  }

  dispose() {
    this.disposed = true;
    this.pending = null;
    this.client.dispose();
  }

  preview(fontId: string) {
    if (this.disposed) return;
    this.thumbnails.request(fontId);
    void this.convertPending();
  }

  private async convertPending() {
    if (this.running || this.disposed || !this.defaultFontId) return;
    this.running = true;
    try {
      while ((this.pending || this.thumbnails.hasPending) && !this.disposed) {
        if (!this.pending) {
          await this.thumbnails.renderNext(this.client, () => this.disposed);
          continue;
        }
        const next = this.pending;
        this.pending = null;
        try {
          const id = next.fontId || this.defaultFontId;
          let palette = this.palettes.get(id);
          if (!palette) {
            palette = await this.client.palette(id);
            this.palettes.set(id, palette);
          }
          if (this.disposed || next.version !== this.version) continue;
          this.onPalette(id, palette);
          if (!next.text.trim()) continue;
          const result = await this.client.convert(
            next.text,
            id,
            next.foregroundColor,
            next.colorReplacements
          );
          if (!this.disposed && next.version === this.version)
            this.onState({ status: "ready", result });
        } catch (error) {
          if (!this.disposed && next.version === this.version)
            this.onState({
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Cannot render this text."
            });
        }
      }
    } finally {
      this.running = false;
    }
  }
}
