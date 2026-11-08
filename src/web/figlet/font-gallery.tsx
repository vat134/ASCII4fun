import { AsciiSpinner } from "../ui/ascii-spinner";
import { useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { Button } from "../ui/base/button";
import { FontCard } from "./font-card";
import type { TextFont } from "./text-conversion";

export function FontGallery({
  fonts,
  fontId,
  onChoose,
  status,
  onPreview
}: {
  fonts: TextFont[];
  fontId: string;
  onChoose: (id: string) => void;
  status: "empty" | "pending" | "ready" | "error";
  onPreview: (id: string) => void;
}) {
  const [category, setCategory] = useState("");
  const categories = [...new Set(fonts.map((font) => font.category))];
  const visibleFonts = category
    ? fonts.filter((font) => font.category === category)
    : fonts;
  return (
    <section
      aria-label="Fonts"
      className="flex h-[70vh] min-h-0 flex-none flex-col overflow-hidden rounded-xl border bg-card lg:h-auto lg:flex-1"
    >
      <div className="flex min-h-14 shrink-0 items-center justify-between border-b px-5">
        <h2 className="text-sm">Fonts</h2>
        <span className="font-mono text-xs text-muted-foreground">
          {category
            ? `${visibleFonts.length} / ${fonts.length}`
            : fonts.length || "—"}
        </span>
      </div>
      {fonts.length > 0 && (
        <div
          role="group"
          aria-label="Font categories"
          className="flex shrink-0 gap-2 overflow-x-auto border-b p-4"
        >
          {["", ...categories].map((value) => (
            <Button
              key={value}
              variant="outline"
              size="sm"
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
              className="shrink-0 rounded-full text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {value || "All fonts"}
            </Button>
          ))}
        </div>
      )}
      {fonts.length ? (
        <div className="min-h-0 flex-1 p-4">
          <VirtuosoGrid
            key={category}
            aria-label="Font cards"
            data={visibleFonts}
            computeItemKey={(_, font) => font.id}
            initialTopMostItemIndex={Math.max(
              0,
              visibleFonts.findIndex((font) => font.id === fontId)
            )}
            increaseViewportBy={160}
            listClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3"
            itemClassName="min-w-0"
            itemContent={(_, font) => (
              <FontCard
                font={font}
                selected={font.id === fontId}
                onChoose={() => onChoose(font.id)}
                onPreview={onPreview}
              />
            )}
          />
        </div>
      ) : (
        <p
          role="status"
          className="flex flex-1 items-center justify-center gap-3 p-6 text-sm text-muted-foreground"
        >
          {status === "error" ? (
            "Fonts unavailable"
          ) : (
            <>
              <AsciiSpinner /> Loading fonts
            </>
          )}
        </p>
      )}
    </section>
  );
}
