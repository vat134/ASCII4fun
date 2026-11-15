namespace Ascii4Fun.Compact;

/// <summary>Photo preparation and spatial Braille settings for a compact destination.</summary>
public sealed record CompactArtOptions
{
    /// <summary>Destination ID from <see cref="CompactDestinations.All"/>.</summary>
    public string Destination { get; init; } = "steamc";
    /// <summary>Manual columns (4..200), or zero for destination-aware automatic sizing.</summary>
    public int Columns { get; init; }
    /// <summary>Crop width divided by height; zero retains the full source aspect ratio.</summary>
    public double CropAspectRatio { get; init; } = 1;
    /// <summary>Horizontal crop center in normalized source coordinates (0..1).</summary>
    public double CropX { get; init; } = .5;
    /// <summary>Vertical crop center in normalized source coordinates (0..1).</summary>
    public double CropY { get; init; } = .5;
    /// <summary>Crop magnification from 1 to 6.</summary>
    public double CropZoom { get; init; } = 1;
    /// <summary>Clockwise quarter turns before cropping (0..3).</summary>
    public int QuarterTurns { get; init; }
    /// <summary>Tone treatment: photo, texture, sketch, soft or poster.</summary>
    public string Look { get; init; } = "photo";
    /// <summary>Dot quantization: atkinson, floyd, bayer or threshold.</summary>
    public string Dither { get; init; } = "atkinson";
    /// <summary>Invert lightness for light dots on a dark destination.</summary>
    public bool Invert { get; init; } = true;
    /// <summary>Brightness from -1 to 1; zero is neutral.</summary>
    public double Brightness { get; init; }
    /// <summary>Contrast from -1 to 1; zero is neutral.</summary>
    public double Contrast { get; init; }
    /// <summary>Midtone gamma (.3..3); larger values lighten midtones before inversion.</summary>
    public double Gamma { get; init; } = 1;
    /// <summary>Local detail strength (0..1).</summary>
    public double Detail { get; init; } = .35;
    /// <summary>Thinned edge emphasis (0..1).</summary>
    public double Edges { get; init; }
    /// <summary>Use percentile levels and automatic target ink coverage.</summary>
    public bool AutoLevels { get; init; } = true;

    internal void Validate()
    {
        _ = CompactDestinations.Get(Destination);
        if (Columns != 0 && Columns is < 4 or > 200) throw new ArgumentOutOfRangeException(nameof(Columns));
        if (QuarterTurns is < 0 or > 3) throw new ArgumentOutOfRangeException(nameof(QuarterTurns));
        if (Look is not ("photo" or "texture" or "sketch" or "soft" or "poster")) throw new ArgumentException("Choose a supported compact look.", nameof(Look));
        if (Dither is not ("atkinson" or "floyd" or "bayer" or "threshold")) throw new ArgumentException("Choose a supported dot dithering method.", nameof(Dither));
        Check(CropAspectRatio, 0, 4, nameof(CropAspectRatio));
        if (CropAspectRatio > 0 && CropAspectRatio < .25) throw new ArgumentOutOfRangeException(nameof(CropAspectRatio));
        Check(CropX, 0, 1, nameof(CropX)); Check(CropY, 0, 1, nameof(CropY));
        Check(CropZoom, 1, 6, nameof(CropZoom));
        Check(Brightness, -1, 1, nameof(Brightness)); Check(Contrast, -1, 1, nameof(Contrast));
        Check(Gamma, .3, 3, nameof(Gamma)); Check(Detail, 0, 1, nameof(Detail)); Check(Edges, 0, 1, nameof(Edges));
    }

    private static void Check(double value, double min, double max, string name)
    {
        if (!double.IsFinite(value) || value < min || value > max) throw new ArgumentOutOfRangeException(name);
    }
}
