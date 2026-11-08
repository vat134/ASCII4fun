import { useCallback, useRef, useState } from "react";
import { maxFontPreviews, type TextFont } from "./text-conversion";
import type { AsciiPreviewResult } from "../rendering/ascii-preview-result";

/** Metadata and the bounded display-raster cache have separate lifetimes. */
export function useTextFonts() {
  const [fonts, setFonts] = useState<TextFont[]>([]);
  const thumbnailOrder = useRef<string[]>([]);
  const updateThumbnail = useCallback(
    (id: string, preview: AsciiPreviewResult | null, previewError?: string) => {
      thumbnailOrder.current = [
        ...thumbnailOrder.current.filter((value) => value !== id),
        id
      ].slice(-maxFontPreviews);
      setFonts((values) =>
        values.map((font) =>
          font.id === id
            ? { ...font, preview, previewError }
            : font.preview && !thumbnailOrder.current.includes(font.id)
              ? { ...font, preview: null }
              : font
        )
      );
    },
    []
  );
  const updatePalette = useCallback((id: string, palette: string[]) => {
    setFonts((values) =>
      values.map((font) => (font.id === id ? { ...font, palette } : font))
    );
  }, []);
  return { fonts, setFonts, updateThumbnail, updatePalette };
}
