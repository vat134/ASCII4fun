using System.Buffers.Binary;
using Ascii4Fun.Figlet;
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

using (var input = new MemoryStream(encoded))
{
    var canvas = await new StillImageConverter().ConvertAsync(input,
        new CharacterImageOptions { Style = ImageStyle.Braille, OutputWidthInCells = 4, Invert = true });
    var png = await PngExporter.ExportAsync(canvas);
    if (canvas.Text != "\u2800\u2800⣿⣿" || png.Length < 24)
        throw new InvalidDataException("Packaged spatial Braille changed its text or PNG contract.");
}

foreach (var font in FigletConverter.Fonts)
{
    var canvas = FigletConverter.Convert("ASCII Text", font.Id);
    var png = await PngExporter.ExportAsync(canvas);
    if (string.IsNullOrWhiteSpace(canvas.Text) || png.Length < 24
        || BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(16, 4)) != canvas.WidthInCells * PngExporter.CellWidthInPixels
        || BinaryPrimitives.ReadInt32BigEndian(png.AsSpan(20, 4)) != canvas.HeightInCells * PngExporter.CellHeightInPixels)
    {
        throw new InvalidDataException($"Packaged FIGlet font {font.Id} did not produce its canvas and PNG.");
    }
}

var palette = FigletConverter.GetFontPalette("tdf-colorrounded");
var authored = FigletConverter.Convert("ASCII Text", "tdf-colorrounded");
var recolored = FigletConverter.Convert("ASCII Text", "tdf-colorrounded",
    colorReplacements: new Dictionary<RgbColor, RgbColor> { [new(0, 0, 170)] = new(255, 30, 50) });
if (palette.Count != 15 || authored.Text != recolored.Text || authored.Cells.SequenceEqual(recolored.Cells)
    || (await PngExporter.ExportAsync(recolored)).Length < 24)
{
    throw new InvalidDataException("Packaged font palette replacement changed layout or failed to recolor PNG.");
}

Console.WriteLine("Published NuGet consumer: image Unicode, bundled text fonts and palette replacements render to PNG.");
