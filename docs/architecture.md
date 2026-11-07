# Architecture

ASCII4fun has one .NET engine, consumed by the browser's HTTP host, CLI and NuGet clients.

```text
Web -> HTTP host -> engine -> Magick.NET
CLI -------------> engine
NuGet client ----> engine
```

| Owner                  | Responsibility                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `src/engine/images`    | Conversion options, luminance analysis, tone mapping and immutable glyph/color cells |
| `src/engine/media`     | Bounded decoding, orientation, color normalization and sampling through Magick.NET   |
| `src/engine/rendering` | Shared cell geometry, bundled font rendering and PNG encoding                        |
| `src/server`           | Upload validation, request limits, cancellation and HTTP responses                   |
| `src/cli`              | Arguments, file destinations and terminal output                                     |
| `src/web`              | Local controls, request lifecycle, preview navigation and downloads                  |

The conversion path is explicit: decode/normalize -> sample -> analyze -> tone map -> map glyphs/colors. `StillImageConverter` coordinates these stages; algorithms do not depend on HTTP or CLI code.

`AsciiCanvas` is the conversion result. TXT projects its glyphs; `PngExporter` renders its cells. Web displays and downloads the same PNG bytes. Zoom and panning are presentation state. `CharacterCellGeometry` owns the fixed 12 × 24 px cell and derives the sampling ratio from it.

Web initialization and Reset share one options factory. `RgbaGrid` owns source-channel layout and white compositing; conversion stages consume normalized RGB samples.

Keep modules concrete and grouped by capability. Add abstractions when real consumers require them. Public XML comments describe behavior, units, constraints and cancellation; comments explain decisions rather than repeat code.

Verification covers deterministic conversion, media failures, HTTP behavior and browser journeys. `node tools/test-package.mjs` packs the engine, restores an isolated NuGet consumer and runs its published output with ASCII, Blocks and supplementary Unicode glyphs. This checks packaged fonts without project references or repository build settings.
