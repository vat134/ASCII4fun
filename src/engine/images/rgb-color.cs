namespace Ascii4Fun.Images;

/// <summary>An opaque color with 8-bit sRGB channels.</summary>
/// <param name="Red">Red channel.</param>
/// <param name="Green">Green channel.</param>
/// <param name="Blue">Blue channel.</param>
public readonly record struct RgbColor(byte Red, byte Green, byte Blue);
