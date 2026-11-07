namespace Ascii4Fun.Media;

internal static class ImageGridGeometry
{
    public static void ValidateDimensions(uint width, uint height, ConversionLimits limits)
    {
        if (width == 0 || height == 0)
        {
            throw new InvalidDataException("The image dimensions must be greater than zero.");
        }

        if (width > limits.MaxInputDimension || height > limits.MaxInputDimension)
        {
            throw new InvalidDataException(
                $"The image dimensions exceed the current {limits.MaxInputDimension}-pixel side limit.");
        }

        var decodedPixels = checked((long)width * height);

        if (decodedPixels > limits.MaxDecodedPixels)
        {
            throw new InvalidDataException(
                $"The image exceeds the current {limits.MaxDecodedPixels:N0}-pixel decode limit.");
        }
    }

    public static int CalculateOutputHeight(
        uint inputWidth,
        uint inputHeight,
        int outputWidthInCells,
        double characterCellAspectRatio,
        int maxGridCells)
    {
        var aspectCorrectHeight =
            (inputHeight / (double)inputWidth) * outputWidthInCells * characterCellAspectRatio;
        var outputHeightInCells = Math.Max(
            1,
            (int)Math.Round(aspectCorrectHeight, MidpointRounding.AwayFromZero));

        if ((long)outputWidthInCells * outputHeightInCells > maxGridCells)
        {
            throw new InvalidDataException(
                $"The requested output exceeds the current {maxGridCells:N0}-cell grid limit.");
        }

        return outputHeightInCells;
    }

}
