namespace Ascii4Fun.Media;

internal sealed record RgbaGrid(int WidthInCells, int HeightInCells, byte[] Pixels)
{
    private const int ChannelsPerPixel = 4;
    private const int GreenChannelOffset = 1;
    private const int BlueChannelOffset = 2;
    private const int AlphaChannelOffset = 3;

    public (double Red, double Green, double Blue) SampleOverWhite(int cellIndex)
    {
        var offset = cellIndex * ChannelsPerPixel;
        var opacity = Pixels[offset + AlphaChannelOffset] / (double)byte.MaxValue;
        return (
            CompositeOverWhite(Pixels[offset], opacity),
            CompositeOverWhite(Pixels[offset + GreenChannelOffset], opacity),
            CompositeOverWhite(Pixels[offset + BlueChannelOffset], opacity));
    }

    private static double CompositeOverWhite(byte channel, double opacity) =>
        ((channel * opacity) + (byte.MaxValue * (1 - opacity))) / byte.MaxValue;
}
