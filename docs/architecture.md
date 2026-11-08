# Architecture

ASCII4fun has one C# conversion engine, hosted by .NET on the desktop/server and .NET WebAssembly in the browser.

```text
Web -> Worker -> shared C# pipeline -> ImageMagick WASM adapter
API / CLI / NuGet -> .NET engine ---> Magick.NET adapter
```

| Owner                     | Responsibility                                                |
| ------------------------- | ------------------------------------------------------------- |
| `src/engine/images`       | Options, luminance, tone, immutable glyph/color cells         |
| `src/engine/figlet`       | FIGfont parsing, layout, font catalog and glyph canvases      |
| `src/engine/media`        | Input policy, aspect-correct grid and native decoding         |
| `src/engine/rendering`    | Cell/font rules, shared RGB compositor and native PNG export  |
| `src/engine/browser`      | .NET WASM host linking the authoritative engine source files  |
| `src/web/browser-engine`  | WASM runtime and shared font adapter                          |
| `src/web/images/worker`   | Browser codecs, normalized source lifetime and sampling       |
| `src/web/images`          | Media controls, scheduling and bounded result cache           |
| `src/web/rendering`       | Shared preview, zoom, copy and raster/text downloads          |
| `src/cli/image-output.cs` | CLI file/stdout output and collision-safe generated filenames |
| `src/server`, `src/cli`   | HTTP and file-system boundaries                               |

The flow is decode/normalize -> sample -> analyze -> tone -> glyph/color mapping -> raster/export. Media adapters use ImageMagick; TypeScript does not implement ASCII mapping. Both hosts use the same ICC profile bytes, bundled fonts, 12 × 24 px geometry and C# raster compositor.

`AsciiCanvas` separates conversion from its representations: TXT projects glyphs; PNG renders cells and background. Web fits the shared raster to the viewport with high-quality canvas filtering at display resolution; PNG downloads retain the full original pixels. PNG compression may differ between hosts; decoded pixels must agree. Zoom and panning affect presentation only.

FIGlet parses and lays out fonts in `src/engine/figlet`, preserving ordinary spaces and hardblanks until layout finishes. `AsciiCanvas` preserves generated glyphs, including ordinary spaces; Copy and TXT use its exact text. The rasterizer skips ordinary spaces and the empty Braille pattern. Text preview size changes only presentation. Text and Media share the download controls and full-raster PNG encoder; TXT preserves exact generated text.

Image styles share the same analysis and tone stages. Characters sample once per cell; Braille samples a 2 × 4 region and maps each adjusted luminance at threshold 0.5 to its Unicode dot position. Invert chooses bright or dark dots. Original ink averages the adjusted RGB of active dots; Mono uses fixed ink. C# owns sampling scale and final cell geometry, so the two media adapters use identical dimensions.

One Worker owns one normalized original. Each conversion samples its character grid afresh, preserving quality. An enabled source-photo background retains one prepared RGBA layer in .NET for the current geometry; tone/opacity changes reuse it. Disabling the photo drops its reference; WASM memory capacity may stay allocated until Worker termination. `ImagePreviewSession` runs one conversion and keeps only the latest pending settings. Its source-scoped LRU accounts for RGBA arrays, text and keys: 16 MiB, 24 entries, at most 8 MiB per admitted result. The current result is retained even when too large to cache. Clear/replacement terminates the Worker and discards history; editor settings survive.

Browser admission estimates source, clone, interop and raster/export buffers against 768 MiB; the ImageMagick pixel cache allows 256 MiB with no disk spill. Raster sides are limited to 16,384 px. Excessive work fails visibly without reducing quality. These ceilings do not reserve memory in advance or cap browser process RAM; platform canvas limits may be lower. They are not an animation cache design.

The editor receives its bounds from the image-options endpoint: 16–180 columns and -40..40 for Brightness/Contrast. Native engine/API/CLI ranges remain broader.

Tone follows global luminance normalization. Shadow lift applies `v^(1/(1 + lift/50))` before contrast/brightness and is exactly neutral at zero. Contrast approaches a flat midpoint at -100 and gain 5 at +100; brightness adds percentage points. Original applies the same adjustment to sampled sRGB channels. Invert changes glyph mapping only. Mono ink and background remain fixed, defaulting to #FFFFFF and #000000; transparent input is composited over white before analysis.

Source-photo opacity defaults to zero. Media adapters sample the normalized original at full output geometry; the shared compositor blends photo alpha/opacity over BackgroundColor, then glyph coverage over that result. The photo ignores tone and invert and adds no glyphs to TXT. A shared 12-million-pixel ceiling bounds its retained RGBA layer to 48 MB before expansion. Browser admission also accounts for photo/interop buffers; these policies do not cap total process memory.

The browser SDK project remains outside the native solution so package/CLI consumers need no WASM workload. `pnpm build:web` publishes it, builds Parcel assets and installs runtime/fonts/notices into the server's static output. Runtime notices are vendored from .NET 10.0.14 and must be refreshed when the SDK runtime changes. Browser dependencies are magick-wasm 0.0.46 (codecs/fonts) and the existing Magick.NET.Core 15.0.0 (built-in ICC profiles).

Tests cover native/browser pixel equality, Unicode, ICC/EXIF/alpha, scheduling, memory rejection, recovery and current-result downloads. `node tools/test-package.mjs` verifies an isolated published NuGet consumer and its bundled fonts.

Text uses the same canvas/export path. The shared font catalog includes FIGfont and TheDraw readers with authored cell backgrounds. The C# engine extracts whole-font palettes and applies individual color replacements for matching preview and PNG. Monochrome fonts keep Text color. React Virtuoso 4.18.20 virtualizes the responsive gallery: only the viewport and one card-height buffer are mounted. Thumbnails for mounted cards are loaded behind active text edits and retain at most 32 rasters of 384 × 160 px (7.5 MiB of RGBA payload, excluding display canvases/runtime). See the font catalog audit for compatibility and unresolved redistribution terms.
