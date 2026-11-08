# Architecture

ASCII4fun has one C# conversion engine, hosted by .NET on the desktop/server and .NET WebAssembly in the browser.

```text
Web -> Worker -> shared C# pipeline -> ImageMagick WASM adapter
API / CLI / NuGet -> .NET engine ---> Magick.NET adapter
```

| Owner                     | Responsibility                                                          |
| ------------------------- | ----------------------------------------------------------------------- |
| `src/engine/images`       | Options, luminance, tone, immutable glyph/color cells                   |
| `src/engine/animations`   | GIF source lifetime, shared timing, sequence tone and export            |
| `src/engine/videos`       | FFmpeg process lifetime, video timing, preparation and MP4/audio export |
| `src/engine/figlet`       | FIGfont parsing, layout, font catalog and glyph canvases                |
| `src/engine/media`        | Input policy, aspect-correct grid and native decoding                   |
| `src/engine/rendering`    | Cell/font rules, shared RGB compositor and native PNG export            |
| `src/engine/browser`      | .NET WASM host linking the authoritative engine source files            |
| `src/web/browser-engine`  | WASM runtime and shared font adapter                                    |
| `src/web/images/worker`   | Browser codecs, normalized source lifetime and sampling                 |
| `src/web/images`          | Media controls, scheduling and bounded result cache                     |
| `src/web/rendering`       | Shared preview, zoom, copy and raster/text downloads                    |
| `src/cli/image-output.cs` | CLI file/stdout output and collision-safe generated filenames           |
| `src/server`, `src/cli`   | HTTP and file-system boundaries                                         |

The flow is decode/normalize -> sample -> analyze -> tone -> glyph/color mapping -> raster/export. Image/GIF adapters use ImageMagick; video containers and audio use external FFmpeg/ffprobe. TypeScript does not implement ASCII mapping. Both hosts use the same ICC profile bytes, bundled fonts, 12 × 24 px geometry and C# raster compositor.

`AsciiCanvas` separates conversion from its representations: TXT projects glyphs; PNG renders cells and background. Web fits the shared raster to the viewport with high-quality canvas filtering at display resolution; PNG downloads retain the full original pixels. PNG compression may differ between hosts; decoded pixels must agree. Zoom and panning affect presentation only.

FIGlet parses and lays out fonts in `src/engine/figlet`, preserving ordinary spaces and hardblanks until layout finishes. `AsciiCanvas` preserves generated glyphs, including ordinary spaces; Copy and TXT use its exact text. The rasterizer skips ordinary spaces and the empty Braille pattern. Text preview size changes only presentation. Text and Media share the download controls and full-raster PNG encoder; TXT preserves exact generated text.

Images sample once per character cell and map normalized, tone-adjusted luminance through the selected character ramp. Original ink uses sampled RGB; Mono uses fixed ink. The shared C# engine owns final cell geometry, so both media adapters use identical dimensions.

One Worker owns one normalized original. Each conversion samples its character grid afresh, preserving quality. An enabled source-photo background retains one prepared RGBA layer in .NET for the current geometry; tone/opacity changes reuse it. Disabling the photo drops its reference; WASM memory capacity may stay allocated until Worker termination. `ImagePreviewSession` runs one conversion and keeps only the latest pending settings. Its source-scoped LRU accounts for RGBA arrays, text and keys: 16 MiB, 24 entries, at most 8 MiB per admitted result. The current result is retained even when too large to cache. Clear/replacement terminates the Worker and discards history; editor settings survive.

Browser admission estimates source, clone, interop and raster/export buffers against 768 MiB; the ImageMagick pixel cache allows 256 MiB with no disk spill. Raster sides are limited to 16,384 px. Excessive work fails visibly without reducing quality. These ceilings do not reserve memory in advance or cap browser process RAM; platform canvas limits may be lower. GIF sources use the same admission budget and result cache; the source adapter retains a bounded coalesced sequence, not all rendered output frames.

The editor receives its bounds from the image-options endpoint: 16–180 columns and -40..40 for Brightness/Contrast. Native engine/API/CLI ranges remain broader.

Tone follows global luminance normalization. Shadow lift applies `v^(1/(1 + lift/50))` before contrast/brightness and is exactly neutral at zero. Contrast approaches a flat midpoint at -100 and gain 5 at +100; brightness adds percentage points. Original applies the same adjustment to sampled sRGB channels. Invert changes glyph mapping only. Mono ink and background remain fixed, defaulting to #FFFFFF and #000000; transparent input is composited over white before analysis.

Source-photo opacity defaults to zero. Media adapters sample the normalized original at full output geometry; the shared compositor blends photo alpha/opacity over BackgroundColor, then glyph coverage over that result. The photo ignores tone and invert and adds no glyphs to TXT. A shared 12-million-pixel ceiling bounds its retained RGBA layer to 48 MB before expansion. Browser admission also accounts for photo/interop buffers; these policies do not cap total process memory.

The browser SDK project remains outside the native solution so package/CLI consumers need no WASM workload. `pnpm build:web` publishes it, builds Parcel assets and installs runtime/fonts/notices into the server's static output. Runtime notices are vendored from .NET 10.0.14 and must be refreshed when the SDK runtime changes. Browser dependencies are magick-wasm 0.0.46 (codecs/fonts) and the existing Magick.NET.Core 15.0.0 (built-in ICC profiles).

Tests cover native/browser pixel equality, Unicode, ICC/EXIF/alpha, scheduling, memory rejection, recovery and current-result downloads. `node tools/test-package.mjs` verifies an isolated published NuGet consumer and its bundled fonts.

Text uses the same canvas/export path. The shared font catalog includes FIGfont and TheDraw readers with authored cell backgrounds. The C# engine extracts whole-font palettes and applies individual color replacements for matching preview and PNG. Monochrome fonts keep Text color. React Virtuoso 4.18.20 virtualizes the responsive gallery: only the viewport and one card-height buffer are mounted. Thumbnails for mounted cards are loaded behind active text edits and retain at most 32 rasters of 384 × 160 px (7.5 MiB of RGBA payload, excluding display canvases/runtime). See the font catalog audit for compatibility and unresolved redistribution terms.

Text HTTP routes live in src/server/figlet; CLI commands list-fonts and convert-text call the same FigletConverter used by the browser. Transport color strings become engine RGB values at ingress. TXT preserves exact canvas text; PNG uses PngExporter. Text HTTP and image conversion share the existing bounded concurrency and timeout policies. See README for request fields and output formats.

GIF sources are composed by the ImageMagick collection adapters before sampling. Both hosts apply the existing ICC policy and compute one sampled luminance range across the sequence per grid. Frames then use the same CharacterImagePipeline and CanvasRasterizer as still images. The C# AnimationTimeline owns normalized delays, the source-average FPS ceiling, speed, FPS resampling and centisecond rounding; The FPS slider maps its upper stop to original irregular source timing and lower stops to integer FPS. React schedules by elapsed time and drops overdue presentation frames without changing the exported timeline. Pausing/seeking changes presentation, not conversion semantics. Media clocks stop while its workspace is hidden.

GIF output is encoded natively through GifAnimation.ExportAsync. A whole-sequence 256-color, non-dithered palette keeps static colors stable; GIF quantization is a documented format loss relative to full-color PNG. The browser POST streams transient progress followed by base64 GIF; cancellation joins the source-owning operation and releases frames. The channel retains only the latest progress count, not durable work. No dependency, storage, job queue or parallel frame execution was added. Native source/output frame collections remain in memory within admission limits; the browser retains only its bounded source, active raster and source-scoped result cache. See README for endpoint, package and CLI contracts and numeric limits.

Video uses external FFmpeg/ffprobe for bounded container/codec/audio operations. Native export streams one frame through the existing Magick sampling, C# character pipeline and rasterizer into an MP4 encoder. Browser preparation produces H.264/AAC; an audio-led clock keeps sound moving while a separate paused decoder supplies frames to the shared conversion worker. Video uses fixed full-range luminance bounds and the shared C# `VideoTimeline`. Request-owned temporary files are removed after codecs stop; no server source session is retained. See [Short video](video.md) for codecs, setup, limits, audio and HTTP/CLI/package contracts.
