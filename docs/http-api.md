# HTTP contract generation

C# HTTP models and Minimal API metadata own the contract. `contracts/http/openapi.json` and `src/web/api/generated/http-api.d.ts` are generated snapshots committed together. Do not edit their fields by hand.

Run `pnpm generate:http-contracts` after changing an HTTP model or endpoint. Run `pnpm check:http-contracts` to verify both snapshots without modifying them; CI runs this before TypeScript checks. Both commands need the pinned .NET SDK and installed pnpm dependencies. They build the native server once, without building Web/WASM, listening for requests, or invoking codecs. Build-time OpenAPI generation executes application startup with a mock server, so keep startup free of conversion or external side effects.

The declaration generator is a development tool. It adds no browser runtime client. Existing fetch, FormData, cancellation and NDJSON validation remain explicit. TypeScript declarations do not validate JSON at runtime.

## Wire formats

- Image conversion uses multipart form fields. Its JSON response and Text's default JSON response share `ImageConversionResponse`; PNG bytes are base64 strings.
- Mini art uses multipart `image` and a `settings` string containing `CompactArtOptions` JSON. Its response separates rectangular canvas text/PNG from the formatted destination payload. See [Mini art](compact-art.md) for controls, budgets and native entry points.
- Text conversion's `format` request field selects JSON, UTF-8 text or PNG. `Accept` does not select Text output.
- GIF/video conversion sends an uploaded `image` and a `settings` **string** containing JSON for `AnimationConversionRequest`. The nested schema is generated from the same C# request used for deserialization. It does not change multipart encoding.
- Video preparation returns MP4 bytes and an `X-Video-Metadata` **string** containing JSON for the generated `VideoMetadata` schema. Decode the header explicitly.
- GIF/video export returns binary media unless an acceptable `application/x-ndjson` Accept entry has positive quality. NDJSON schemas describe one line's event, not an array or a generated stream reader. Progress events precede a terminal complete/error event; format-specific completion fields contain base64 bytes. Cancellation or a disconnected transport can interrupt the stream without a terminal event.
- Multipart calls require the antiforgery token from `/api/images/options` and its matching cookie. Preserve both. Application failures use Problem Details; transport/framework failures and timeouts can have empty bodies.

The development server exposes `/openapi/v1.json`; production does not. Generation does not require this endpoint.

## Model boundaries

Media processing adds optional `usePhotoStyle` (false). See [Photo processing](photo-processing.md) for the fixed Photo alphabet, Classic compatibility and sample bounds. HTTP contracts and TypeScript types remain generated from C#.

HTTP models stay with their server capability. The engine and browser-WASM project have no dependency on OpenAPI. UI state and Worker protocols have separate responsibilities: a fully populated editor state is not the same type as an HTTP request with optional defaults.

ASP.NET Core's schema exporter reflects Web JSON's acceptance of quoted numeric input. The server schema transformer preserves that input behavior while describing numeric output as numbers. It also marks properties actually emitted by the current concrete response models and supplies literal event tags from the writer's C# constants. Embedded settings, decoded metadata and event schemas use .NET 10's `GetOrCreateSchemaAsync`; their fields are not copied into a second schema implementation.

`openapi-typescript` runs with `defaultNonNullable: false`: a documented default must not make an optional request field mandatory in TypeScript. Generated files remain typechecked and formatted; ESLint excludes only the generated directory.

## Dependencies and evidence

- `Microsoft.AspNetCore.OpenApi` 10.0.14: server schema generation.
- `Microsoft.Extensions.ApiDescription.Server` 10.0.14: build-only tooling, private to the server project.
- `openapi-typescript` 7.13.0: development-only declarations.

These direct dependencies use MIT licenses. Removing generation requires removing its registration/build tooling and restoring handwritten HTTP declarations; no data migration is involved.

The isolated proof verified multipart strings, JSON header metadata, response numbers, nullable/defaulted inputs, base64 and literal event unions. A temporary C# response-field rename made freshness checking fail for both artifacts without overwriting them. API tests compare actual configuration properties with the schema and cover format descriptions and development-only document access. Existing API/media tests remain the behavioral compatibility evidence.

Learning objective: follow a change from a C# transport model through OpenAPI into TypeScript, then distinguish static type checking, freshness checking and actual runtime validation.

Sources: [ASP.NET Core OpenAPI generation](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi?view=aspnetcore-10.0), [schema transformers](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/customize-openapi?view=aspnetcore-10.0#support-for-generating-openapischemas-in-transformers), [openapi-typescript](https://openapi-ts.dev/introduction).
