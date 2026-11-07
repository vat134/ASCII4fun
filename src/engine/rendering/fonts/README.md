# PNG fonts

Unmodified fonts used by the engine, copied to build/publish output and NuGet consumers under `rendering/fonts`. No font installation, network access, or writable font cache is required at runtime.

| File                        | Source                                                                                                                                                      | SHA-256                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ibm-plex-mono-regular.ttf` | [IBM Plex Mono complete TTF, internal version 2.005](https://github.com/IBM/plex/blob/master/packages/plex-mono/fonts/complete/ttf/IBMPlexMono-Regular.ttf) | `7c6fbddca4b700be918f5f6183d9bd4464fa427fe435f0b480d77fe2bb8c5a43` |
| `unifont.otf`               | [GNU Unifont 17.0.05](https://unifoundry.com/pub/unifont/unifont-17.0.05/font-builds/unifont-17.0.05.otf)                                                   | `85701ab9b1e251ee16f4df00b13f22eac311d72b7dab427a7d975fe7f5064702` |
| `unifont-upper.otf`         | [GNU Unifont Upper 17.0.05](https://unifoundry.com/pub/unifont/unifont-17.0.05/font-builds/unifont_upper-17.0.05.otf)                                       | `f4fd6d5d752726d384feef175bb780c9f29382cd4941c9e1e6990d7c3822a090` |

Retrieved 2026-10-27. Full SIL OFL 1.1 text and upstream copyright statements are in `ibm-plex-license.txt` and `unifont-license.txt`. The GNU fonts are distributed under their OFL alternative. Font versions and hashes are pinned by these checked-in files.

Rendering policy: ASCII uses IBM at 20 px with baseline 19 px; other BMP scalars use Unifont at 24 px with baseline 21 px; supplementary scalars use Unifont Upper at the same size/baseline. These values were verified in the raster probe. Advance width is fitted to 12 px and every glyph is clipped to a 12 × 24 px cell. This preserves geometry for wide glyphs without affecting adjacent cells. Unassigned scalars follow the bundled font's missing-glyph behavior; there is no system fallback.
