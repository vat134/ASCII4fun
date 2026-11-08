using ImageMagick;

namespace Ascii4Fun.Media;

internal static class MagickColorNormalizer
{
    public static void Apply(IMagickImage<byte> image)
    {
        if (image.TransformColorSpace(ColorProfiles.SRGB))
        {
            return;
        }

        if (image.ColorSpace == ColorSpace.CMYK)
        {
            image.TransformColorSpace(ColorProfiles.USWebCoatedSWOP, ColorProfiles.SRGB);
            return;
        }

        image.ColorSpace = ColorSpace.sRGB;
    }
}
