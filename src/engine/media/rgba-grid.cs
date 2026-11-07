namespace Ascii4Fun.Media;

internal sealed record RgbaGrid(int WidthInCells, int HeightInCells, byte[] Pixels)
{
    public double ChannelOverWhite(int channelOffset)
    {
        var opacity = Pixels[((channelOffset / 4) * 4) + 3] / (double)byte.MaxValue;
        return ((Pixels[channelOffset] * opacity) + (byte.MaxValue * (1 - opacity))) / byte.MaxValue;
    }
}
