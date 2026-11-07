# Media fixtures

Project-authored RGB gradient and synthetic bounds fixtures, generated with Magick.NET 15.0.0. No third-party photographs.

`oriented.jpg` carries EXIF orientation 6; `tagged-rgb.png` carries the library's built-in Adobe RGB profile; `untagged-cmyk.jpg` exercises the native engine's existing CMYK fallback. `animated.webp` contains two distinct frames. The two `over-*.png` files are valid, highly compressed images rejected by browser admission/dimension checks before full decoding.

`square-gradient.png` is a 912 × 912 gradient for dense preview downscaling. `tall.png` is 100 × 10,000 and exercises the browser raster-side limit at 16 columns.
