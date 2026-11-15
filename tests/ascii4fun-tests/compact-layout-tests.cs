using Ascii4Fun.Compact;

namespace Ascii4Fun.Tests;

public sealed class CompactLayoutTests
{
    [Theory]
    [InlineData(4, 1)]
    [InlineData(25, 13)]
    [InlineData(60, 32)]
    [InlineData(200, 200)]
    public void LiveDestinationCountsMatchExactFormattedPayload(int columns, int rows)
    {
        var text = string.Join('\n', Enumerable.Repeat(new string('\u2800', columns), rows));
        foreach (var destination in CompactDestinations.All)
            Assert.Equal(CompactDestinations.Format(text, columns, rows, destination.Id).Count,
                CompactDestinations.Count(columns, rows, destination));
    }

    [Fact]
    public void SteamCommentAutoUsesTwentyFiveColumnsAndFitsExactUtf8Budget()
    {
        var options = new CompactArtOptions();
        var layout = CompactArtGeometry.Plan(400, 400, options);
        Assert.Equal(25, layout.Columns);
        Assert.Equal(13, layout.Rows);
        var payload = CompactDestinations.Format(string.Join('\n', Enumerable.Repeat(new string('\u28ff', 25), 13)), 25, 13, options.Destination);
        Assert.Equal(987, payload.Count);
        Assert.True(payload.Fits);
        Assert.Equal("bytes", payload.Unit);
    }

    [Fact]
    public void TwitchFormatsOneMessageWithCleanLeadInAndCountsEverySeparator()
    {
        var payload = CompactDestinations.Format("⠁⠀\n⠂⠃", 2, 2, "twitch");
        Assert.Equal("⠀⠀ ⠁⠀ ⠂⠃", payload.Text);
        Assert.DoesNotContain('\n', payload.Text);
        Assert.Equal(8, payload.Count);
    }

    [Fact]
    public void CatalogContainsOnlySteamTelegramTwitchAndFile()
    {
        Assert.Equal(["Steam", "Telegram", "Twitch", "File"], CompactDestinations.All.Select(item => item.Platform).Distinct());
        Assert.Equal(6, CompactDestinations.All.Count);
        Assert.Throws<ArgumentException>(() => CompactDestinations.Get("reddit"));
    }

    [Fact]
    public void CropReportsFractionalFootprintIncludingReferencePaddingAndManualWidthCanExceedBudget()
    {
        var layout = CompactArtGeometry.Plan(800, 400, new CompactArtOptions { CropX = 1, CropZoom = 2 });
        Assert.Equal(700, layout.CropXInPixels);
        Assert.Equal(200, layout.CropWidthInPixels);
        var wide = CompactArtGeometry.Plan(400, 400, new CompactArtOptions { Columns = 40 });
        Assert.Equal(40, wide.Columns);
        var payload = CompactDestinations.Format(string.Join('\n', Enumerable.Repeat(new string('\u2800', 40), wide.Rows)), 40, wide.Rows, "steamc");
        Assert.False(payload.Fits);
    }

    [Fact]
    public void SubpixelCropRetainsRequestedAspectAndZoom()
    {
        var layout = CompactArtGeometry.Plan(1, 1, new CompactArtOptions { CropAspectRatio = 4, CropZoom = 6, Columns = 48 });
        Assert.Equal(6, layout.Rows);
        Assert.Equal(1d / 6, layout.CropWidthInPixels);
        Assert.Equal(1d / 24, layout.CropHeightInPixels);
    }

    [Fact]
    public void ExcessivelyTallSampleGridIsRejectedBeforeTonePreparation()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => CompactArtGeometry.Plan(1, 4000,
            new CompactArtOptions { CropAspectRatio = 0, Columns = 4, Look = "sketch" }));
        var bounded = CompactArtGeometry.Plan(100, 2000, new CompactArtOptions { CropAspectRatio = 0, Columns = 47 });
        Assert.InRange(bounded.SampleHeightInPixels, 1, 2048);
    }

    [Theory]
    [InlineData(double.NaN)]
    [InlineData(double.PositiveInfinity)]
    [InlineData(0.2)]
    public void InvalidGammaIsRejectedBeforeSampling(double gamma) =>
        Assert.Throws<ArgumentOutOfRangeException>(() => CompactArtGeometry.Plan(400, 400, new CompactArtOptions { Gamma = gamma }));
}
