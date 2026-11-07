using System.Buffers.Binary;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

// Owned black/white fixture; the consumer has no project reference or direct media dependency.
var encoded = Convert.FromBase64String(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAEUlEQVR4nGNgAIP/YMCAzAEAd6IL9cTZu14AAAAASUVORK5CYII=");

foreach (var glyph in new[] { "@", "█", "𝔸" })
{
    using var input = new MemoryStream(encoded);
    var canvas = await new StillImageConverter().ConvertAsync(input, new CharacterImageOptions
    {
        OutputWidthInCells = 4,
        CharacterRamp = glyph + " ",
        SourceColors = true,
        ShadowLift = 50,
        SourcePhotoOpacity = 35
    });
    if (canvas.Text != glyph + glyph + "  ")
    {
        throw new InvalidDataException($"Packaged conversion changed the {glyph} text projection.");
    }

    var png = await PngExporter.ExportAsync(canvas);
    if (png.Length < 24 || !png.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
    {
        throw new InvalidDataException("The published package consumer did not produce PNG.");
    }

    var width = BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(16, 4));
    var height = BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(20, 4));
    if (width != canvas.WidthInCells * PngExporter.CellWidthInPixels
        || height != canvas.HeightInCells * PngExporter.CellHeightInPixels)
    {
        throw new InvalidDataException("PNG dimensions disagree with the packaged canvas.");
    }
}

Console.WriteLine("Published NuGet consumer: ASCII, Blocks and supplementary Unicode PNG passed.");
