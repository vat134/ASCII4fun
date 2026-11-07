# ASCII4fun

Local-first toolkit for converting images, animations, and text into ASCII and cell-based art.

Status: JPEG, PNG and still WebP to monochrome or source-colored ASCII, with TXT and PNG export through the browser, package and CLI. Text and animation conversion are planned.

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

`convert-image` accepts JPEG, PNG, and still WebP. Use `--ramp`, `--invert`, or `--output` for the initial text controls.

## PNG export

Web defaults to Original color; package, CLI and omitted HTTP flags remain monochrome. Contrast, Brightness, Mono color and Background share engine semantics. Mono defaults to white on black. TXT always saves characters only.

```powershell
pnpm convert:image dev-assets/input/photo.webp --width 160 --invert --source-colors --format png
```

The CLI defaults to TXT. PNG requires `--output` or `--output-directory`; the command above uses `dev-assets/output`. Pass `--invert` to match the browser's dark preview.

The package returns `AsciiCanvas` (replacing the pre-release `AsciiText` type). Use `canvas.Text` for TXT and `await PngExporter.ExportAsync(canvas)` for PNG.

PNG uses fixed 12 × 24 px cells, bundled OFL fonts and an opaque background (black by default). Downloaded PNG pixels match preview; zoom and dragging only affect the view. Font details and licenses are in [rendering/fonts](src/engine/rendering/fonts/README.md).

The existing multipart `/api/images/convert` accepts optional `sourceColors=false`, `contrast=0`, `brightness=0`, `monochromeColor=#FFFFFF` and `backgroundColor=#000000` and returns `{ text, widthInCells, heightInCells, png }`, with base64 PNG. Uploaded media remains transient.

Browser working buffers and result history are bounded; oversized work fails explicitly. First use loads the WASM runtimes and required fonts. See [architecture](docs/architecture.md) for ownership and limits.
