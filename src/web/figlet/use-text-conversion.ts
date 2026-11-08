import { useEffect, useRef, useState } from "react";
import {
  fontSampleText,
  defaultTextColor,
  type FontColorReplacements,
  type TextPreviewState
} from "./text-conversion";
import { useTextFonts } from "./use-text-fonts";
import { TextPreviewSession } from "./text-preview-session";

export function useTextConversion(active: boolean) {
  const [text, setText] = useState(fontSampleText);
  const [fontId, setFontId] = useState("");
  const [foregroundColor, setForegroundColor] = useState(defaultTextColor);
  const [colorReplacements, setColorReplacements] =
    useState<FontColorReplacements>({});
  const fontReplacements = useRef<Record<string, FontColorReplacements>>({});
  const { fonts, setFonts, updateThumbnail, updatePalette } = useTextFonts();
  const [state, setState] = useState<TextPreviewState>({ status: "pending" });
  const [attempt, setAttempt] = useState(0);
  const session = useRef<TextPreviewSession | null>(null);
  const latest = useRef({ text, fontId, foregroundColor, colorReplacements });

  useEffect(() => {
    if (!active) return;
    const current = new TextPreviewSession(
      setState,
      setFonts,
      updateThumbnail,
      updatePalette
    );
    session.current = current;
    current.request(
      latest.current.text,
      latest.current.fontId,
      latest.current.foregroundColor,
      latest.current.colorReplacements
    );
    return () => {
      session.current = null;
      current.dispose();
    };
  }, [active, attempt, setFonts, updateThumbnail, updatePalette]);

  function request(patch: Partial<typeof latest.current>) {
    latest.current = { ...latest.current, ...patch };
    const next = latest.current;
    session.current?.request(
      next.text,
      next.fontId,
      next.foregroundColor,
      next.colorReplacements
    );
  }

  function changeText(value: string) {
    setText(value);
    request({ text: value });
  }

  function chooseFont(value: string) {
    const color = fonts.find((font) => font.id === value)?.hasNativeColors
      ? ""
      : foregroundColor;
    const replacements = fontReplacements.current[value] ?? {};
    setFontId(value);
    setColorReplacements(replacements);
    request({
      fontId: value,
      foregroundColor: color,
      colorReplacements: replacements
    });
  }

  function changeColor(value: string) {
    setForegroundColor(value);
    request({ foregroundColor: value });
  }

  function changeFontColor(source: string, value: string) {
    const replacements = {
      ...latest.current.colorReplacements,
      [source]: value
    };
    if (source.toLowerCase() === value.toLowerCase())
      delete replacements[source];
    fontReplacements.current[latest.current.fontId] = replacements;
    setColorReplacements(replacements);
    request({ colorReplacements: replacements });
  }

  function resetColors() {
    const id = latest.current.fontId;
    delete fontReplacements.current[id];
    setColorReplacements({});
    setForegroundColor(defaultTextColor);
    request({
      colorReplacements: {},
      foregroundColor: fonts.find((font) => font.id === id)?.hasNativeColors
        ? ""
        : defaultTextColor
    });
  }

  return {
    text,
    fontId: fontId || fonts[0]?.id || "",
    fonts,
    foregroundColor,
    state,
    changeText,
    chooseFont,
    changeColor,
    colorReplacements,
    changeFontColor,
    resetColors,
    requestThumbnail: (id: string) => session.current?.preview(id),
    retry: () => setAttempt((value) => value + 1)
  };
}
