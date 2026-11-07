# Media fixtures

Project-authored RGB gradients and synthetic bounds fixtures. Small decoding fixtures were generated with Magick.NET 15.0.0. No third-party photographs.

`oriented.jpg` carries EXIF orientation 6; `tagged-rgb.png` carries the library's built-in Adobe RGB profile; `untagged-cmyk.jpg` exercises the native engine's existing CMYK fallback. `animated.webp` contains two distinct frames. The two `over-*.png` files are valid, highly compressed images rejected by browser admission/dimension checks before full decoding.

`square-gradient.png` is a 912 × 912 gradient for dense preview downscaling. `tall.png` is 100 × 10,000 and exercises the browser raster-side limit at 16 columns.

`large-portrait.jpg` (1882 × 3344) and `twelve-megapixel.jpg` (3072 × 4096) are project-authored Pillow gradients for working-buffer and photo-resize regressions. The synthetic `over-budget.png` is 6000 × 5000, exceeding the 768 MiB admission ceiling before decode.
