using Ascii4Fun.Images;

namespace Ascii4Fun.Tests;

public sealed class CharacterImageOptionsTests
{
    [Theory]
    [InlineData(0xD800, false)]
    [InlineData(0xDC00, false)]
    [InlineData(0xD800, true)]
    [InlineData(0xDC00, true)]
    public void RejectsAnUnpairedSurrogateInsteadOfReplacingTheRequestedGlyph(int codeUnit, bool trailing)
    {
        var invalid = new string((char)codeUnit, 1);
        var options = new CharacterImageOptions { CharacterRamp = trailing ? "@" + invalid : invalid + "@" };

        var error = Assert.Throws<ArgumentException>(() => options.ValidateAndGetRamp());

        Assert.Equal(nameof(CharacterImageOptions.CharacterRamp), error.ParamName);
    }

    [Theory]
    [InlineData("\U0001F680@", 0x1F680)]
    [InlineData("\uFFFD@", 0xFFFD)]
    public void PreservesValidSupplementaryAndExplicitReplacementGlyphs(string text, int expectedScalar)
    {
        var ramp = new CharacterImageOptions { CharacterRamp = text }.ValidateAndGetRamp();

        Assert.Equal(2, ramp.Length);
        Assert.Equal(expectedScalar, ramp[0].Value);
        Assert.Equal('@', ramp[1].Value);
    }
}
