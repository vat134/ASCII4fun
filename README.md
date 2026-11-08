# ASCII4fun

Local-first toolkit for converting images, animations, and text into ASCII and cell-based art.

Status: JPEG, PNG and still WebP to character or spatial Braille art, with TXT/PNG export. The Text workspace uses the shared engine for FIGlet/TheDraw and TXT/PNG export. Animation is planned.

## Stack

- .NET 10 / C# 14 — engine, CLI, HTTP API, local host
- React / TypeScript / Parcel / Tailwind / shadcn — browser UI
- xUnit / Jest / Cypress — tests

## Layout

| Path         | Purpose                             |
| ------------ | ----------------------------------- |
| `src/engine` | Conversion engine and NuGet package |
| `src/cli`    | CLI entry point                     |
| `src/server` | ASP.NET Core API and Web host       |
| `src/web`    | Browser client                      |
| `tests`      | .NET and Web tests                  |
| `e2e`        | Cypress tests                       |
| `benchmarks` | Performance measurements            |

Dependency direction: `Web / API / CLI -> Ascii4Fun engine -> media boundary`.

## Requirements

- .NET 10 SDK with the `wasm-tools` workload
- Node.js 22.9 or later
- pnpm 10.19

Cypress end-to-end tests use an installed Chrome browser.

## Commands

```powershell
pnpm install --frozen-lockfile
dotnet workload install wasm-tools
dotnet restore ascii4fun.slnx

pnpm check
dotnet format ascii4fun.slnx --verify-no-changes --no-restore
dotnet build ascii4fun.slnx --configuration Release --no-restore
dotnet test ascii4fun.slnx --configuration Release --no-build

pnpm dev
pnpm test:e2e

pnpm convert:image dev-assets/input/photo.webp --width 100
```

`dev` serves the development UI at `http://127.0.0.1:1234` with live updates and proxies API/runtime assets to ASP.NET Core at port 5100. Image conversion runs locally in a Worker using the shared C# engine. `pnpm start` builds and serves the UI directly from ASP.NET Core at `http://127.0.0.1:5100`.

Development defaults and Zod validation live in `tools/development-environment.cjs`. Copy `.env.example` to `.env.local` for overrides; shell variables take priority. Restart development processes after editing it or changing engine code. The server launcher, Parcel proxy and Cypress share these settings. Direct .NET launches use standard ASP.NET Core configuration instead.

`convert-image` accepts JPEG, PNG, and still WebP. Use `--style braille` for spatial dots; `--ramp` controls the default character style.

## PNG export

Web defaults to Original color; package, CLI and omitted HTTP flags remain monochrome. Tone and background controls share engine semantics. Mono defaults to white on black. TXT and Copy preserve generated glyphs and ordinary spaces. Spatial Braille retains its own Unicode dot patterns, including the empty pattern. Chat alignment still depends on the receiving font and line width.

```powershell
pnpm convert:image dev-assets/input/photo.webp --width 160 --invert --source-colors --format png
```

The CLI defaults to TXT. PNG requires `--output` or `--output-directory`; the command above uses `dev-assets/output`. Pass `--invert` to match the browser's dark preview.

The package returns `AsciiCanvas` (replacing the pre-release `AsciiText` type). Use `canvas.Text` for TXT and `await PngExporter.ExportAsync(canvas)` for PNG.

`ShadowLift` / `--shadow-lift` lifts dark tones; `SourcePhotoOpacity` / `--source-photo-opacity` adds the normalized original beneath glyphs. Both range from 0 to 100 and default to 0. Photo tone stays unchanged; its additional raster is limited to 12 million pixels.

PNG uses fixed 12 × 24 px cells, bundled OFL fonts and an opaque background (black by default). Downloaded PNG pixels match preview; zoom and dragging only affect the view. Font details and licenses are in [rendering/fonts](src/engine/rendering/fonts/README.md).

The existing multipart `/api/images/convert` accepts optional `style=characters` (`braille` selects spatial dots), `sourceColors=false`, `contrast=0`, `brightness=0`, `shadowLift=0`, `sourcePhotoOpacity=0`, `monochromeColor=#FFFFFF` and `backgroundColor=#000000` and returns `{ text, widthInCells, heightInCells, png }`, with base64 PNG. Uploaded media remains transient.

Browser working buffers and result history are bounded; oversized work fails explicitly. First use loads the WASM runtimes and required fonts. See [architecture](docs/architecture.md) for ownership and limits.

## Text through CLI and HTTP

All entry points use `FigletConverter` and the same bundled font catalog. List IDs and render text:

```powershell
dotnet run --project src/cli -- list-fonts
dotnet run --project src/cli -- convert-text "Hello" --font standard
dotnet run --project src/cli -- convert-text "Hello" --font tdf-colorrounded --format png --output hello.png
```

`convert-text` defaults to `standard` and TXT on stdout. `--output` (`-o`) writes a file and is required for PNG. TXT preserves exact engine text as UTF-8 without a BOM or added newline. Explicit output files are overwritten. Omit `--color` to preserve authored font colors; `--color '#00FFAA'` overrides foregrounds. Repeat `--replace-color '#FFFFFF=#00FFAA'` to replace original foreground/background shades simultaneously. A foreground override and palette replacements cannot be combined; duplicate original shades are rejected.

HTTP endpoints:

- `GET /api/text/fonts` returns font IDs, names, categories, native-color capability and notes.
- `GET /api/text/fonts/{fontId}/palette` returns whole-font colors as `#RRGGBB` strings; unknown IDs return 404.
- `POST /api/text/convert` accepts `application/json`:

```json
{
  "text": "Hello",
  "fontId": "standard",
  "format": "json",
  "colorReplacements": { "#FFFFFF": "#00FFAA" }
}
```

Only `text` is required. `fontId` defaults to `standard`; `format` defaults to `json`, returning `{ text, widthInCells, heightInCells, png }` with base64 PNG. Set `format` to `txt` for exact UTF-8 `text/plain` or `png` for an `image/png` attachment. The JSON `format` field selects the representation; `Accept` does not select it. Optional `foregroundColor` is the HTTP equivalent of CLI `--color`.

Both transports enforce the engine's 256-character/eight-line input and 4,096-column/32,768-cell output bounds. Unsupported glyphs and invalid settings fail explicitly. HTTP errors use Problem Details (400 invalid input, 415 unsupported request content type, 429 busy); conversions and palette scans share the existing one-active-operation/no-queue limit and 30-second timeout. Cancellation reaches conversion and PNG export. Requests use the server's existing bounded body limit, store no files, and conversion responses use `Cache-Control: no-store`. Text JSON requests do not require the image multipart antiforgery token. These are initial local-use contracts; external API stabilization remains planned.
