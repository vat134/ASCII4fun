# Still-image measurements

Run without other builds or browser tests:

```sh
dotnet run --project benchmarks/ascii4fun-benchmarks -c Release -- path/to/image.png
```

JSON lines compare neutral, Shadow lift 50, and Shadow lift 50 with photo opacity 35 at 80/160/180 columns. Each case uses two warmups and ten samples. Input file reading is excluded; conversion includes decoding, normalization, sampling and mapping. PNG timing includes rasterization and encoding.

Managed allocations exclude ImageMagick's native memory. Process peak is cumulative across cases, not per-conversion retention. These native timings do not measure browser startup, transfer, canvas painting or cache hits. Keep private input images and generated evidence outside Git.
