using Ascii4Fun.Media;

namespace Ascii4Fun.Compact;

// MIT Typist tone.js f128e782 port; see bundled typist-license.txt.
internal static partial class CompactToneMapper
{
    internal sealed record EdgeField(double[] Magnitude, bool[] Thin);
    internal sealed record PreparedTone(double[] Lightness, EdgeField Edge, bool[] TransparentSamples);

    internal static double[] Apply(RgbaGrid samples, CompactArtOptions options, CancellationToken token = default) =>
        Prepare(samples, options, token).Lightness;

    internal static PreparedTone Prepare(RgbaGrid samples, CompactArtOptions options, CancellationToken token)
    {
        ArgumentNullException.ThrowIfNull(samples);
        ArgumentNullException.ThrowIfNull(options);
        token.ThrowIfCancellationRequested();
        options.Validate();
        CompactDotEncoder.ValidateShape(samples.WidthInPixels, samples.HeightInPixels, samples.Pixels.Length / 4);
        if ((long)samples.WidthInPixels * samples.HeightInPixels * 4 != samples.Pixels.Length)
            throw new ArgumentException("Invalid compact RGBA buffer.", nameof(samples));
        var width = samples.WidthInPixels;
        var height = samples.HeightInPixels;
        var input = new double[width * height];
        var alpha = new double[input.Length];
        for (var i = 0; i < input.Length; i++)
        {
            alpha[i] = F(samples.Pixels[i * 4 + 3] / 255d);
            var luma = (.2126 * samples.Pixels[i * 4] + .7152 * samples.Pixels[i * 4 + 1] + .0722 * samples.Pixels[i * 4 + 2]) / 255;
            input[i] = F(luma * alpha[i] + 1 - alpha[i]);
        }
        return Prepare(input, alpha, width, height, options, token);
    }

    internal static PreparedTone Prepare(double[] input, double[] alpha, int width, int height,
        CompactArtOptions options, CancellationToken token)
    {
        token.ThrowIfCancellationRequested();
        var boost = Clamp((36 - width / 2d) / 20);
        var output = options.Look switch
        {
            "photo" => Photo(input, alpha, width, height, options, token),
            "texture" => Texture(input, alpha, width, height, options, boost, token),
            "sketch" => Sketch(input, alpha, width, height, options, boost, token),
            "soft" => Soft(input, alpha, width, height, options, boost, .4, token),
            "poster" => Poster(input, alpha, width, height, options, token),
            _ => throw new ArgumentException("Choose a supported compact look.", nameof(options))
        };
        var edge = Edges(output, width, height, token);
        if (options.Edges > 0)
            for (var i = 0; i < output.Length; i++)
                output[i] = F(Clamp(output[i] - options.Edges * (edge.Magnitude[i] * (edge.Thin[i] ? 1 : .35))));
        return new PreparedTone(output, edge, alpha.Select(value => value == 0).ToArray());
    }
}
