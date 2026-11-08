using System.CommandLine;
using Ascii4Fun.Images;

namespace Ascii4Fun.Cli;

internal static class ConvertImageCommand
{
    public static Command Create()
    {
        var inputArgument = new Argument<FileInfo>("input")
        {
            Description = "Path to a JPEG, PNG, or still WebP image."
        };
        inputArgument.AcceptExistingOnly();

        var widthOption = new Option<int>("--width")
        {
            Description = "Output width in character cells.",
            DefaultValueFactory = _ => CharacterImageOptions.DefaultOutputWidthInCells
        };
        widthOption.Aliases.Add("-w");

        var rampOption = new Option<string>("--ramp")
        {
            Description = "Characters ordered from darkest to lightest.",
            DefaultValueFactory = _ => CharacterImageOptions.DefaultCharacterRamp
        };

        var invertOption = new Option<bool>("--invert")
        {
            Description = "Reverse light and dark character mapping."
        };

        var sourceColorsOption = new Option<bool>("--source-colors")
        {
            Description = "Use sampled source colors for PNG; TXT still saves glyphs only."
        };
        var densityOption = new Option<bool>("--measured-density")
        {
            Description = "Choose glyphs by measured bundled-font density instead of ramp order."
        };
        var contrastOption = new Option<int>("--contrast") { Description = "Contrast from -100 to 100; 0 preserves tone." };
        var brightnessOption = new Option<int>("--brightness") { Description = "Brightness from -100 to 100; 0 preserves tone." };
        var monochromeOption = new Option<string>("--mono-color")
        {
            Description = "Monochrome ink in #RRGGBB notation.",
            DefaultValueFactory = _ => CharacterImageOptions.DefaultMonochromeColor.ToHex()
        };
        var backgroundOption = new Option<string>("--background")
        {
            Description = "Opaque PNG background in #RRGGBB notation.",
            DefaultValueFactory = _ => CharacterImageOptions.DefaultBackgroundColor.ToHex()
        };
        var shadowLiftOption = new Option<int>("--shadow-lift")
        {
            Description = "Lift dark tones before contrast/brightness (0..100, default 0)."
        };
        var photoOpacityOption = new Option<int>("--source-photo-opacity")
        {
            Description = "Original photo opacity beneath PNG glyphs (0..100, default 0). TXT is unchanged."
        };
        var formatOption = new Option<string>("--format")
        {
            Description = "Output format: txt or png.",
            DefaultValueFactory = _ => "txt"
        };
        formatOption.AcceptOnlyFromAmong("txt", "png");

        var outputOption = new Option<FileInfo?>("--output")
        {
            Description = "Write the selected format to a file instead of text stdout."
        };
        outputOption.Aliases.Add("-o");

        var outputDirectoryOption = new Option<DirectoryInfo>("--output-directory")
        {
            Description = "Create a file in the selected format using the input name in this directory."
        };
        outputDirectoryOption.AcceptExistingOnly();

        var command = new Command("convert-image", "Convert one still image to ASCII text or PNG.")
        {
            inputArgument,
            widthOption,
            rampOption,
            invertOption,
            sourceColorsOption,
            densityOption,
            contrastOption,
            brightnessOption,
            shadowLiftOption,
            photoOpacityOption,
            monochromeOption,
            backgroundOption,
            formatOption,
            outputOption,
            outputDirectoryOption
        };

        command.Validators.Add(result =>
        {
            var hasOutput = result.GetResult(outputOption) is not null;
            var hasOutputDirectory = result.GetResult(outputDirectoryOption) is not null;
            if (hasOutput && hasOutputDirectory)
            {
                result.AddError("Use either --output or --output-directory, not both.");
            }

            if (result.GetResult(formatOption)?.Tokens.Any(token => token.Value == "png") == true
                && !hasOutput && !hasOutputDirectory)
            {
                result.AddError("PNG requires --output or --output-directory.");
            }
        });

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            var input = parseResult.GetRequiredValue(inputArgument);
            try
            {
                var options = new CharacterImageOptions
                {
                    OutputWidthInCells = parseResult.GetValue(widthOption),
                    CharacterRamp = parseResult.GetRequiredValue(rampOption),
                    Invert = parseResult.GetValue(invertOption),
                    SourceColors = parseResult.GetValue(sourceColorsOption),
                    UseMeasuredGlyphDensity = parseResult.GetValue(densityOption),
                    Contrast = parseResult.GetValue(contrastOption),
                    Brightness = parseResult.GetValue(brightnessOption),
                    ShadowLift = parseResult.GetValue(shadowLiftOption),
                    SourcePhotoOpacity = parseResult.GetValue(photoOpacityOption),
                    MonochromeColor = RgbColor.ParseHex(parseResult.GetRequiredValue(monochromeOption)),
                    BackgroundColor = RgbColor.ParseHex(parseResult.GetRequiredValue(backgroundOption))
                };
                AsciiCanvas result;

                var fileOptions = new FileStreamOptions
                {
                    Mode = FileMode.Open,
                    Access = FileAccess.Read,
                    Share = FileShare.Read,
                    Options = FileOptions.Asynchronous | FileOptions.SequentialScan
                };

                await using (var inputStream = new FileStream(input.FullName, fileOptions))
                {
                    result = await new StillImageConverter().ConvertAsync(
                        inputStream,
                        options,
                        cancellationToken);
                }

                var output = parseResult.GetValue(outputOption);
                DirectoryInfo? outputDirectory = parseResult.GetValue(outputDirectoryOption);
                var format = parseResult.GetRequiredValue(formatOption);

                await ImageOutput.WriteAsync(result, input, output, outputDirectory, format, cancellationToken);

                return 0;
            }
            catch (Exception exception) when (
                exception is ArgumentException
                    or IOException
                    or UnauthorizedAccessException)
            {
                Console.Error.WriteLine($"Error: {exception.Message}");
                return 1;
            }
        });

        return command;
    }
}
