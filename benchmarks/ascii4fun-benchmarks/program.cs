using System.Diagnostics;
using System.Text.Json;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

if (args.Length == 0)
{
    Console.Error.WriteLine("Provide one or more still-image paths. Run in Release without other benchmarks.");
    return 1;
}

const int samples = 10;
const int warmups = 2;
var converter = new StillImageConverter();
foreach (var path in args)
{
    var encoded = await File.ReadAllBytesAsync(path);
    foreach (var columns in new[] { 80, 160, 180 })
    {
        foreach (var (shadowLift, photoOpacity) in new[] { (0, 0), (50, 0), (50, 35) })
        {
            var options = new CharacterImageOptions
            {
                OutputWidthInCells = columns,
                Invert = true,
                SourceColors = true,
                ShadowLift = shadowLift,
                SourcePhotoOpacity = photoOpacity
            };
            var conversion = new List<double>();
            var export = new List<double>();
            var allocations = new List<long>();
            for (var iteration = -warmups; iteration < samples; iteration++)
            {
                var allocatedBefore = GC.GetTotalAllocatedBytes(precise: true);
                var timer = Stopwatch.StartNew();
                using var input = new MemoryStream(encoded, writable: false);
                var canvas = await converter.ConvertAsync(input, options);
                var conversionMs = timer.Elapsed.TotalMilliseconds;
                timer.Restart();
                var png = await PngExporter.ExportAsync(canvas);
                if (iteration < 0) continue;
                conversion.Add(conversionMs);
                export.Add(timer.Elapsed.TotalMilliseconds);
                allocations.Add(GC.GetTotalAllocatedBytes(precise: true) - allocatedBefore);
                GC.KeepAlive(png);
            }

            Console.WriteLine(JsonSerializer.Serialize(new
            {
                source = Path.GetFileName(path),
                columns,
                shadowLift,
                photoOpacity,
                samples,
                warmups,
                conversionMs = Summarize(conversion),
                pngIncludingRasterMs = Summarize(export),
                medianManagedAllocatedBytes = allocations.Order().ElementAt(samples / 2),
                cumulativeProcessPeakWorkingSetBytes = Process.GetCurrentProcess().PeakWorkingSet64
            }));
        }
    }
}
return 0;

static Timing Summarize(List<double> values)
{
    var sorted = values.Order().ToArray();
    return new Timing(sorted[sorted.Length / 2], sorted[(int)Math.Ceiling(sorted.Length * 0.95) - 1]);
}

internal sealed record Timing(double P50, double P95);

