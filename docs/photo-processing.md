# Photo processing

Classic remains the default. Enable **Photo processing** in Media Settings to preserve local detail and select directional ASCII strokes. The same C# implementation serves browser still/GIF/video frames, package, REST and CLI. This is an additional conversion style, not a claim of exact Typist output or semantic scene understanding.

## Processing and controls

The adapter samples both the existing color/tone grid and a bounded 4 x 8 RGBA raster per output cell. C# computes linear luminance and uses the existing image/sequence tone range, clamps subcell samples, separates a guided local base from detail, and applies a limited detail boost. Contrast, Brightness, Shadow lift and Invert retain their processing order and color semantics. Photo measures fifteen overlapping circles on a 3 x 5 lattice, using the same geometry for source samples and bundled glyph masks. Matching combines normalized direction and tone; flat or poorly fitting cells retain a measured tone glyph.

Photo owns a small printable-ASCII tone/stroke alphabet. Its glyph masks are measured from the bundled renderer, not copied from Typist's Geist Mono data. CharacterRamp and UseMeasuredGlyphDensity are Classic controls; Photo hides those controls without discarding their state. Switching back to Classic restores them. Photo does not add color palettes, post-processing, source-photo opacity, or foreground extraction implicitly.

Spatial sampling is limited to 2,000,000 pixels (62,500 output cells). Requests exceeding it fail explicitly. Existing raster/photo/source limits still apply; the browser also reserves extra working-buffer allowance. Source/sequence data is transient. Each native adapter/browser Worker calibrates one immutable Photo glyph map lazily; no source image, frame or user palette is held by this map. All source-dependent analysis runs per conversion. The first Photo use includes this bounded calibration; warm timings must not be presented as cold startup.

## Headless use

Enable `CharacterImageOptions.UsePhotoStyle` in package callers, `usePhotoStyle` in still-image multipart fields or GIF/video nested options, or `--photo-style` in the three media CLI commands. The default is false. OpenAPI and TypeScript HTTP snapshots are generated from C#.

## Sources and learning

- [Alex Harri: ASCII characters are not pixels](https://alexharri.com/blog/ascii-rendering): spatial glyph shape matters in addition to mean tone.
- [Typist pinned source](https://github.com/winchxyz/typist/tree/f128e782e33de2dcb013eb572a02e236851cc662): 3 x 5 circle geometry, structure-gated direction/tone matching and a limited tone alphabet informed this implementation. No font vectors, procedural samples or UI assets are bundled. See THIRD_PARTY_NOTICES.md for attribution.
- [Magick.NET 15.0.0 resizing](https://github.com/dlemstra/Magick.NET/blob/15.0.0/docs/ResizeImage.md): adapters use fixed-size native sampling; no TypeScript conversion algorithm is added.
- [Guided image filtering](https://people.csail.mit.edu/kaiming/eccv10/index.html): edge-preserving local base/detail separation. Here the boost is conservative and bounded; Typist's full saliency/Otsu/auto-ink pipeline is not reproduced.
- [.NET 10 Lazy<T>](https://learn.microsoft.com/en-us/dotnet/api/system.lazy-1?view=net-10.0): built-in, thread-safe one-time font calibration; source-dependent data remains outside the cached value.

Learning objective: distinguish spatial information from global contrast, font calibration from per-frame work. The existing ImageMagick adapters own resampling; C# owns analysis, glyph choice and composition. No new package is needed. The deliberate differences are our actual font/cell metrics, preserved linear-light tone contract, bounded local enhancement and existing animation exposure range.
