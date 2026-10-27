# Development assets

Use `input/` for local photos, GIFs, and other media used during manual development. Write generated previews and exports to `output/`.

Files inside both directories are intentionally ignored by Git. They are local working material, not stable automated-test fixtures. A fixture needed by CI belongs under the relevant `tests/` project and must include its origin and redistribution rights.

```powershell
pnpm convert:image ".\dev-assets\input\photo.jpg" --width 120
```

The generated file uses the input name. Existing names are preserved by adding `-1`, `-2`, and so on.
