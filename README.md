# ASCII4fun

Local-first toolkit for converting images, animations, and text into ASCII and cell-based art.

Status: toolchain foundation; conversion is not implemented yet.

## Stack

- .NET 10 / C# 14 — engine, CLI, HTTP API, local host
- React / TypeScript / Parcel — browser UI
- xUnit / Jest / Cypress — tests

## Layout

| Path                   | Purpose                             |
| ---------------------- | ----------------------------------- |
| `src/ascii4fun`        | Conversion engine and NuGet package |
| `src/ascii4fun-cli`    | CLI entry point                     |
| `src/ascii4fun-server` | ASP.NET Core API and Web host       |
| `src/ascii4fun-web`    | Browser client                      |
| `tests`                | .NET and Web tests                  |
| `e2e`                  | Cypress tests                       |
| `benchmarks`           | Performance measurements            |

Dependency direction: `Web / API / CLI -> Ascii4Fun engine -> media boundary`.

## Requirements

- .NET 10 SDK
- Node.js 22.9 or later
- pnpm 10.19

## Commands

```powershell
pnpm install --frozen-lockfile
dotnet restore ascii4fun.slnx

pnpm check
dotnet format ascii4fun.slnx --verify-no-changes --no-restore
dotnet build ascii4fun.slnx --configuration Release --no-restore
dotnet test ascii4fun.slnx --configuration Release --no-build

pnpm dev
pnpm test:e2e
```

`dev` serves the UI at `http://127.0.0.1:5100`; health is available at `/health`.
