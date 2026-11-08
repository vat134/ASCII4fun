using System.CommandLine;
using Ascii4Fun.Animations;
using Ascii4Fun.Videos;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Cli;

internal static class ConvertVideoCommand
{
    public static Command Create()
    {
        var input = new Argument<FileInfo>("input") { Description = "Path to an MP4, WebM or MOV clip up to 60 seconds." };
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
        var fps = new Option<int?>("--fps") { Description = "Resample to 1..60 FPS, capped at the source average; omitted preserves source timing." };
        var ffmpeg = new Option<string>("--ffmpeg-path") { DefaultValueFactory = _ => "ffmpeg" };
        var ffprobe = new Option<string>("--ffprobe-path") { DefaultValueFactory = _ => "ffprobe" };
        var command = new Command("convert-video", "Convert a short video to ASCII MP4, preserving source sound.")
        {
            input, output, width, ramp, invert, sourceColors, density, contrast, brightness, shadowLift,
            photo, mono, background, speed, fps, ffmpeg, ffprobe
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
                await using var clip = await VideoClip.OpenAsync(source,
                    new VideoTools(result.GetRequiredValue(ffmpeg), result.GetRequiredValue(ffprobe)), cancellationToken);
                byte[] bytes;
                try
                {
                    bytes = await clip.ExportAsync(options,
                        new AnimationPlaybackOptions { Speed = result.GetValue(speed), FramesPerSecond = result.GetValue(fps) },
                        new FrameProgress(), cancellationToken);
                }
                finally { Console.Error.WriteLine(); }
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
        public void Report(int value) => Console.Error.Write($"\r{value} frames rendered; preparing MP4.");
    }
}
