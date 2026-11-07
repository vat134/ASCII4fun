using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Ascii4Fun.Images;
using Ascii4Fun.Media;
using Ascii4Fun.Rendering;
using ImageMagick;

namespace Ascii4Fun.Browser;

[SupportedOSPlatform("browser")]
internal static partial class BrowserImageEngine
{
    private static AsciiCanvas? current;
    private static BrowserSourcePhoto? sourcePhoto;

    public static void Main() { }

    [JSExport]
    public static byte[] SrgbProfile() => ColorProfiles.SRGB.ToByteArray();

    [JSExport]
    public static byte[] CmykProfile() => ColorProfiles.USWebCoatedSWOP.ToByteArray();

    [JSExport]
    public static int[] Limits() => [(int)ConversionLimits.Default.MaxEncodedBytes,
        (int)ConversionLimits.Default.MaxDecodedPixels, ConversionLimits.Default.MaxInputDimension];

    [JSExport]
    public static int[] Geometry() => [CharacterCellGeometry.WidthInPixels, CharacterCellGeometry.HeightInPixels];

    [JSExport]
    public static int PhotoByteLength(int widthInCells, int heightInCells) => SourcePhotoGeometry.ByteLength(widthInCells, heightInCells);

    [JSExport]
    public static void SetSourcePhoto(byte[] rgba, int widthInCells, int heightInCells)
    {
        sourcePhoto = null;
        if (rgba.Length == 0) return;
        if (rgba.Length != PhotoByteLength(widthInCells, heightInCells))
        {
            throw new ArgumentException("The prepared photo does not match the output geometry.", nameof(rgba));
        }
        sourcePhoto = new BrowserSourcePhoto(rgba, widthInCells, heightInCells);
    }

    [JSExport]
    public static string[] FontNames(string ramp) => ramp.EnumerateRunes()
        .Select(glyph => GlyphRenderSettings.For(glyph).FontName).Distinct(StringComparer.Ordinal).ToArray();

    [JSExport]
    public static void ValidateSource(byte[] bytes)
    {
        if (bytes.Length == 0 || bytes.LongLength > ConversionLimits.Default.MaxEncodedBytes)
        {
            throw new InvalidDataException("Choose a non-empty image within the input limit.");
        }

        StillImageSignature.Validate(bytes);
    }

    [JSExport]
    public static int Height(int width, int height, int columns)
    {
        ImageGridGeometry.ValidateDimensions(checked((uint)width), checked((uint)height), ConversionLimits.Default);
        new CharacterImageOptions { OutputWidthInCells = columns }.ValidateAndGetRamp();
        return ImageGridGeometry.CalculateOutputHeight((uint)width, (uint)height, columns,
            CharacterCellGeometry.AspectRatio, ConversionLimits.Default.MaxGridCells);
    }

    [JSExport]
    public static string Convert(byte[] rgba, int width, int height, string optionsJson)
    {
        var options = JsonSerializer.Deserialize(optionsJson, BrowserJson.Default.CharacterImageOptions)
            ?? throw new ArgumentException("Conversion settings are required.", nameof(optionsJson));
        if (width != options.OutputWidthInCells || height < 1 || (long)width * height > ConversionLimits.Default.MaxGridCells
            || rgba.LongLength != (long)width * height * 4)
        {
            throw new InvalidDataException("The sampled grid does not match the requested geometry.");
        }

        if (options.SourcePhotoOpacity > 0 && (sourcePhoto?.WidthInCells != width || sourcePhoto.HeightInCells != height))
        {
            throw new InvalidOperationException("Prepare the source photo for this geometry before conversion.");
        }
        current = CharacterImagePipeline.Convert(new RgbaGrid(width, height, rgba), options,
            sourcePhotoRgba: options.SourcePhotoOpacity > 0 ? sourcePhoto?.Rgba : null);
        return JsonSerializer.Serialize(new BrowserImageResult(current.Text, width, height), BrowserJson.Default.BrowserImageResult);
    }

    [JSExport]
    public static byte[] Rasterize()
    {
        var canvas = current ?? throw new InvalidOperationException("Convert an image before rendering.");
        current = null;
        return CanvasRasterizer.Render(canvas, RenderGlyph);
    }

    private static byte[] RenderGlyph(Rune glyph)
    {
        var settings = GlyphRenderSettings.For(glyph);
        return RenderMask(settings.FontName, settings.PointSize, settings.BaselineInPixels,
            glyph.ToString(), CharacterCellGeometry.WidthInPixels, CharacterCellGeometry.HeightInPixels);
    }

    [JSImport("renderMask", "image-media")]
    private static partial byte[] RenderMask(string font, int pointSize, int baseline, string glyph, int width, int height);
}

internal sealed record BrowserImageResult(string Text, int WidthInCells, int HeightInCells);
internal sealed record BrowserSourcePhoto(byte[] Rgba, int WidthInCells, int HeightInCells);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(CharacterImageOptions))]
[JsonSerializable(typeof(BrowserImageResult))]
internal sealed partial class BrowserJson : JsonSerializerContext;
