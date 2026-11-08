using System.CommandLine;
using Ascii4Fun.Animations;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Cli;

internal static class ConvertGifCommand
{
    public static Command Create()
    {
        var input = new Argument<FileInfo>("input") { Description = "Path to a GIF file." };
        input.AcceptExistingOnly();
        var output = new Option<FileInfo>("--output") { Required = true, Description = "New destination file; existing files are not overwritten." };
        output.Aliases.Add("-o");
        var width = new Option<int>("--width") { DefaultValueFactory = _ => CharacterImageOptions.DefaultOutputWidthInCells };
        var ramp = new Option<string>("--ramp") { DefaultValueFactory = _ => CharacterImageOptions.DefaultCharacterRamp };
        var invert = new Option<bool>("--invert");
        var sourceColors = new Option<bool>("--source-colors");
        var density = new Option<bool>("--measured-density") { Description = "Choose glyphs by measured bundled-font density." };
        var contrast = new Option<int>("--contrast");
        var brightness = new Option<int>("--brightness");
        var shadowLift = new Option<int>("--shadow-lift");
        var photo = new Option<int>("--source-photo-opacity");
        var mono = new Option<string>("--mono-color") { DefaultValueFactory = _ => "#FFFFFF" };
        var background = new Option<string>("--background") { DefaultValueFactory = _ => "#000000" };
        var speed = new Option<double>("--speed") { DefaultValueFactory = _ => 1, Description = "Playback/export rate (0.25..4)." };
        var fps = new Option<int?>("--fps") { Description = "Resample to 1..50 FPS, capped at the source average; omitted preserves source timing." };
        var frame = new Option<int?>("--frame") { Description = "Save a zero-based source frame as PNG instead of animated GIF." };
        var command = new Command("convert-gif", "Convert a GIF animation or export one source frame as PNG.")
        {
            input, output, width, ramp, invert, sourceColors, density, contrast, brightness, shadowLift,
            photo, mono, background, speed, fps, frame
        };
        command.SetAction(async (result, cancellationToken) =>
        {
            try
            {
                var options = new CharacterImageOptions
                {
                    OutputWidthInCells = result.GetValue(width),
                    CharacterRamp = result.GetRequiredValue(ramp),
                    Invert = result.GetValue(invert),
                    SourceColors = result.GetValue(sourceColors),
                    UseMeasuredGlyphDensity = result.GetValue(density),
                    Contrast = result.GetValue(contrast),
                    Brightness = result.GetValue(brightness),
                    ShadowLift = result.GetValue(shadowLift),
                    SourcePhotoOpacity = result.GetValue(photo),
                    MonochromeColor = RgbColor.ParseHex(result.GetRequiredValue(mono)),
                    BackgroundColor = RgbColor.ParseHex(result.GetRequiredValue(background))
                };
                await using var source = result.GetRequiredValue(input).OpenRead();
                using var animation = await GifAnimation.OpenAsync(source, cancellationToken);
                byte[] bytes;
                if (result.GetValue(frame) is { } index)
                    bytes = await PngExporter.ExportAsync(animation.ConvertFrame(index, options, cancellationToken), cancellationToken);
                else
                {
                    try
                    {
                        bytes = await animation.ExportAsync(options,
                            new AnimationPlaybackOptions { Speed = result.GetValue(speed), FramesPerSecond = result.GetValue(fps) },
                            new FrameProgress(), cancellationToken);
                    }
                    finally { Console.Error.WriteLine(); }
                }
                await using var destination = new FileStream(result.GetRequiredValue(output).FullName, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                await destination.WriteAsync(bytes, cancellationToken);
                return 0;
            }
            catch (Exception exception) when (exception is ArgumentException or IOException or UnauthorizedAccessException)
            {
                Console.Error.WriteLine($"Error: {exception.Message}");
                return 1;
            }
        });
        return command;
    }

    private sealed class FrameProgress : IProgress<int>
    {
        public void Report(int value) => Console.Error.Write($"\r{value} frames rendered; preparing GIF.");
    }
}
