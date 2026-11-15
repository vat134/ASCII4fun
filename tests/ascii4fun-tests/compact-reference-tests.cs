using System.Text.Json;
using System.IO.Compression;
using Ascii4Fun.Compact;
using Ascii4Fun.Media;

namespace Ascii4Fun.Tests;

public sealed class CompactReferenceTests
{
    [Fact]
    public void AllLooksMatchPinnedTypistTonesAndEveryDither()
    {
        using var stream = typeof(CompactReferenceTests).Assembly.GetManifestResourceStream("Ascii4Fun.Tests.CompactReference.json.gz")!;
        using var decompressed = new GZipStream(stream, CompressionMode.Decompress);
        using var fixture = JsonDocument.Parse(decompressed);
        foreach (var item in fixture.RootElement.GetProperty("cases").EnumerateArray())
        {
            var controls = item.GetProperty("controls");
            var options = new CompactArtOptions
            {
                Look = item.GetProperty("look").GetString()!,
                Invert = !controls.TryGetProperty("invert", out var invert) || invert.GetBoolean(),
                AutoLevels = !controls.TryGetProperty("auto", out var auto) || auto.GetBoolean(),
                Brightness = Number("brightness", 0),
                Contrast = Number("contrast", 0),
                Gamma = Number("gamma", 1),
                Detail = Number("detail", .35),
                Edges = Number("edges", 0)
            };
            double Number(string name, double fallback) => controls.TryGetProperty(name, out var value) ? value.GetDouble() : fallback;
            var samples = new RgbaGrid(item.GetProperty("width").GetInt32(), item.GetProperty("height").GetInt32(),
                Convert.FromBase64String(item.GetProperty("rgba").GetString()!));
            var actual = CompactToneMapper.Apply(samples, options);
            var expected = item.GetProperty("lightness").EnumerateArray().Select(value => value.GetDouble()).ToArray();
            var maximumError = actual.Zip(expected, (left, right) => Math.Abs(left - right)).Max();
            Assert.True(maximumError <= 1e-6, $"{item.GetProperty("name")}: maximum tone error {maximumError:R}");
            foreach (var dither in item.GetProperty("text").EnumerateObject())
                Assert.Equal(dither.Value.GetString(), CompactArtPipeline.Convert(samples, options with { Dither = dither.Name }).Text);
        }
    }
    [Fact]
    public void FractionalSamplingAndDownscaleMatchPinnedTypist()
    {
        using var stream = typeof(CompactReferenceTests).Assembly.GetManifestResourceStream("Ascii4Fun.Tests.CompactReference.json.gz")!;
        using var decompressed = new GZipStream(stream, CompressionMode.Decompress);
        using var fixture = JsonDocument.Parse(decompressed);
        foreach (var item in fixture.RootElement.GetProperty("samplingCases").EnumerateArray())
        {
            var crop = item.GetProperty("crop");
            var options = new CompactArtOptions { Columns = 24, CropX = crop.GetProperty("x").GetDouble(), CropY = crop.GetProperty("y").GetDouble(), CropZoom = crop.GetProperty("zoom").GetDouble() };
            var source = new RgbaGrid(item.GetProperty("width").GetInt32(), item.GetProperty("height").GetInt32(), Convert.FromBase64String(item.GetProperty("rgba").GetString()!));
            var layout = CompactArtGeometry.Plan(source.WidthInPixels, source.HeightInPixels, options);
            var samples = CompactSourceSampler.Sample(source, layout, options, default);
            Compare(samples.Lightness, item.GetProperty("lightness"));
            var alpha = item.GetProperty("alpha");
            if (alpha.ValueKind == JsonValueKind.Null) Assert.All(samples.Alpha, value => Assert.Equal(1, value));
            else Compare(samples.Alpha, alpha);
            foreach (var look in item.GetProperty("toned").EnumerateArray())
            {
                var tone = CompactToneMapper.Prepare((double[])samples.Lightness.Clone(), samples.Alpha, samples.Width, samples.Height, options with { Look = look.GetProperty("look").GetString()!, Invert = look.GetProperty("invert").GetBoolean() }, default);
                Compare(tone.Lightness, look.GetProperty("lightness"));
            }
        }
        static void Compare(double[] actual, JsonElement expected)
        {
            var error = actual.Zip(expected.EnumerateArray(), (left, right) => Math.Abs(left - right.GetDouble())).Max();
            Assert.True(error <= 1e-6, $"Maximum reference error {error:R}");
        }
    }
}
