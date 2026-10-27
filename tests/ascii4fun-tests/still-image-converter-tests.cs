using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Media;
using ImageMagick;

namespace Ascii4Fun.Tests;

public sealed class StillImageConverterTests
{
    [Fact]
    public async Task ConvertsPngToGoldenText()
    {
        using var input = new MemoryStream(CreateFourToneImage(MagickFormat.Png));
        var options = new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@ "
        };

        var result = await new StillImageConverter().ConvertAsync(input, options);

        Assert.Equal(4, result.WidthInCells);
        Assert.Equal(1, result.HeightInCells);
        Assert.Equal("@@  ", result.Text);
        Assert.Equal(result.Text, result.ToString());
    }

    [Theory]
    [InlineData(MagickFormat.Jpeg)]
    [InlineData(MagickFormat.Png)]
    [InlineData(MagickFormat.WebP)]
    public async Task ReadsSupportedStillFormats(MagickFormat format)
    {
        using var input = new MemoryStream(CreateFourToneImage(format));
        var options = new CharacterImageOptions { OutputWidthInCells = 4 };

        var result = await new StillImageConverter().ConvertAsync(input, options);

        Assert.Equal(4, result.WidthInCells);
        Assert.Equal(1, result.HeightInCells);
    }

    [Fact]
    public async Task InvertReversesLightAndDarkMapping()
    {
        using var input = new MemoryStream(CreateFourToneImage(MagickFormat.Png));
        var options = new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@ ",
            Invert = true
        };

        var result = await new StillImageConverter().ConvertAsync(input, options);

        Assert.Equal("  @@", result.Text);
    }

    [Fact]
    public async Task NormalizesLowContrastInputBeforeCharacterMapping()
    {
        using var input = new MemoryStream(CreateSplitImage(MagickFormat.Png, 32, 64));
        var options = new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@ "
        };

        var result = await new StillImageConverter().ConvertAsync(input, options);

        Assert.Equal("@@  ", result.Text);
    }

    [Fact]
    public async Task TransparentPixelsUseWhiteTextBackground()
    {
        using var image = new MagickImage(MagickColors.Transparent, 4, 2);
        using var input = new MemoryStream(image.ToByteArray(MagickFormat.Png));
        var options = new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@ "
        };

        var result = await new StillImageConverter().ConvertAsync(input, options);

        Assert.Equal("    ", result.Text);
    }

    [Fact]
    public async Task ProducesAspectCorrectRectangularRows()
    {
        using var image = new MagickImage(MagickColors.White, 8, 8);
        using var input = new MemoryStream(image.ToByteArray(MagickFormat.Png));
        var options = new CharacterImageOptions { OutputWidthInCells = 4 };

        var result = await new StillImageConverter().ConvertAsync(input, options);
        var rows = result.Text.Split('\n');

        Assert.Equal(2, result.HeightInCells);
        Assert.Equal(2, rows.Length);
        Assert.All(rows, row => Assert.Equal(4, row.EnumerateRunes().Count()));
    }

    [Fact]
    public async Task AppliesEncodedOrientationBeforeSizingOutput()
    {
        using var image = new MagickImage(MagickColors.White, 4, 8);
        image.Orientation = ImageMagick.Orientation.RightTop;
        var exif = new ExifProfile();
        exif.SetValue(ExifTag.Orientation, (ushort)ImageMagick.Orientation.RightTop);
        image.SetProfile(exif);
        using var input = new MemoryStream(image.ToByteArray(MagickFormat.Jpeg));
        var options = new CharacterImageOptions { OutputWidthInCells = 4 };

        var result = await new StillImageConverter().ConvertAsync(input, options);

        Assert.Equal(1, result.HeightInCells);
    }

    [Fact]
    public async Task RejectsUnsupportedFormat()
    {
        using var input = new MemoryStream(CreateFourToneImage(MagickFormat.Bmp));

        var exception = await Assert.ThrowsAsync<InvalidDataException>(
            () => new StillImageConverter().ConvertAsync(input));

        Assert.Contains("signature is not supported", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RejectsUnreadableInput()
    {
        using var input = new MemoryStream("not an image"u8.ToArray());

        var exception = await Assert.ThrowsAsync<InvalidDataException>(
            () => new StillImageConverter().ConvertAsync(input));

        Assert.Contains("signature is not supported", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RejectsMalformedInputWithSupportedSignature()
    {
        using var input = new MemoryStream([0xFF, 0xD8, 0xFF, 0x00]);

        var exception = await Assert.ThrowsAsync<InvalidDataException>(
            () => new StillImageConverter().ConvertAsync(input));

        Assert.Contains("not a readable", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task HonorsCancellationBeforeDecoding()
    {
        using var input = new MemoryStream(CreateFourToneImage(MagickFormat.Png));
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => new StillImageConverter().ConvertAsync(
                input,
                cancellationToken: cancellation.Token));
    }

    [Fact]
    public async Task RejectsAnimatedWebP()
    {
        using var frames = new MagickImageCollection
        {
            new MagickImage(MagickColors.Black, 2, 2),
            new MagickImage(MagickColors.White, 2, 2)
        };
        using var input = new MemoryStream(frames.ToByteArray(MagickFormat.WebP));

        var exception = await Assert.ThrowsAsync<InvalidDataException>(
            () => new StillImageConverter().ConvertAsync(input));

        Assert.Contains("multi-frame", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RejectsEncodedInputPastConfiguredLimit()
    {
        var bytes = CreateFourToneImage(MagickFormat.Png);
        using var input = new MemoryStream(bytes);
        var limits = CreateLimits(maxEncodedBytes: bytes.Length - 1);

        var exception = await Assert.ThrowsAsync<InvalidDataException>(
            () => new StillImageConverter(limits).ConvertAsync(input));

        Assert.Contains("input limit", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RejectsDecodedInputPastConfiguredLimit()
    {
        using var input = new MemoryStream(CreateFourToneImage(MagickFormat.Png));
        var limits = CreateLimits(maxDecodedPixels: 7);

        var exception = await Assert.ThrowsAsync<InvalidDataException>(
            () => new StillImageConverter(limits).ConvertAsync(input));

        Assert.Contains("decode limit", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RejectsInvalidCharacterRamp()
    {
        using var input = new MemoryStream(CreateFourToneImage(MagickFormat.Png));
        var options = new CharacterImageOptions
        {
            OutputWidthInCells = 4,
            CharacterRamp = "@"
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => new StillImageConverter().ConvertAsync(input, options));

        Assert.Contains("at least", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static byte[] CreateFourToneImage(MagickFormat format) =>
        CreateSplitImage(format, dark: 0, light: 255);

    private static byte[] CreateSplitImage(MagickFormat format, byte dark, byte light)
    {
        var portablePixmap = $"""
            P3
            4 2
            255
            {dark} {dark} {dark}   {dark} {dark} {dark}   {light} {light} {light}   {light} {light} {light}
            {dark} {dark} {dark}   {dark} {dark} {dark}   {light} {light} {light}   {light} {light} {light}
            """;

        using var image = new MagickImage(Encoding.ASCII.GetBytes(portablePixmap), MagickFormat.Ppm);
        return image.ToByteArray(format);
    }

    private static ConversionLimits CreateLimits(
        long maxEncodedBytes = 1024 * 1024,
        long maxDecodedPixels = 1024 * 1024) =>
        new(
            maxEncodedBytes,
            maxDecodedPixels,
            MaxInputDimension: 4096,
            MaxGridCells: 10_000);
}
