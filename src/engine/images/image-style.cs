namespace Ascii4Fun.Images;

/// <summary>The spatial mapping used to turn sampled image pixels into glyph cells.</summary>
public enum ImageStyle
{
    /// <summary>One sample per cell, mapped through the selected character ramp.</summary>
    Characters,

    /// <summary>Eight samples per cell arranged as a two-column, four-row Braille pattern.</summary>
    Braille
}
