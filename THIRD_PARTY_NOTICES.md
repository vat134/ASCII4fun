# Third-party notices

## UI and icons

- shadcn/ui source components: [MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md), Copyright (c) 2023 shadcn.
- Base UI: [MIT](https://github.com/mui/base-ui/blob/master/LICENSE).
- React Virtuoso 4.18.20: [MIT](https://github.com/petyosi/react-virtuoso/blob/master/LICENSE), responsive font-gallery virtualization.
- Lucide: [ISC](https://github.com/lucide-icons/lucide/blob/main/LICENSE), Copyright (c) Lucide Contributors. Only statically imported icons are bundled.
- The ASCII spinner is a project implementation of the four-frame `| / - \\` pattern, inspired by [scificn's spinner](https://www.scificn.dev/components/spinner). No scificn source is copied.

### shadcn/ui license

MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Fonts

- Aldrich: Copyright (c) Matthew Desmond, 2011; SIL Open Font License 1.1.
- IBM Plex Mono: Copyright 2017 IBM Corp.; SIL Open Font License 1.1.
- GNU Unifont / Unifont Upper 17.0.05: Copyright © 1998-2026 Roman Czyborra, Paul Hardy, Qianqian Fang, Andrew Miller, Johnnie Weaver, David Corbett, Ælla Chiana Moskopp, Rebecca Bettencourt, Ho-Seok Ee, et al.; distributed here under SIL Open Font License 1.1, one of its dual licenses. [Upstream](https://unifoundry.com/unifont/).

UI fonts are self-hosted through pinned Fontsource packages. Complete UI font and browser dependency licenses are included in the browser build through its `rel="license"` document. PNG fonts and their full licenses are bundled with the engine and its NuGet content files; see [font provenance](src/engine/rendering/fonts/README.md).

## Browser processing

- `@imagemagick/magick-wasm` 0.0.46: Apache-2.0, ImageMagick browser codecs and font drawing. The published `engine-runtime/notices/` directory contains its complete `magick-wasm-license.txt` and `magick-wasm-notices.txt`.
- Magick.NET.Core 15.0.0: built-in sRGB and CMYK profile bytes shared with native conversion. Its package copyright ships as `magick-core-notices.txt` in the same directory.
- .NET browser runtime 10.0.14: MIT and upstream third-party notices, copied from the installed `Microsoft.NETCore.App.Runtime.Mono.browser-wasm` runtime pack into `src/engine/browser/notices/`. Refresh these files when updating the runtime; both ship with the browser assets.

## FIGlet fonts

The local text catalog contains 122 FIGfont/AOL assets and 105 TheDraw default variants (227 total). Original headers, collection notices and hashes are recorded in [font notices](src/engine/figlet/fonts/font-licenses.txt), [provenance](src/engine/figlet/fonts/provenance.md) and the [selection audit](src/engine/figlet/fonts/catalog-audit.md). The figlet.js collection declares MIT; individual fonts retain their own author notices and terms, including WTFPL-2.0 where stated. Missing individual terms, especially legacy TheDraw/AOL data, remain unresolved; this local compatibility catalog is not a cleared distribution release. No external FIGlet/TheDraw renderer code is used by the product.
