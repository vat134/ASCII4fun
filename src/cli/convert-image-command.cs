using System.CommandLine;
using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Cli;

internal static class ConvertImageCommand
{
    private static readonly UTF8Encoding Utf8WithoutBom = new(encoderShouldEmitUTF8Identifier: false);

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
            var options = new CharacterImageOptions
            {
                OutputWidthInCells = parseResult.GetValue(widthOption),
                CharacterRamp = parseResult.GetRequiredValue(rampOption),
                Invert = parseResult.GetValue(invertOption),
                SourceColors = parseResult.GetValue(sourceColorsOption)
            };

            try
            {
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

                if (output is not null || outputDirectory is not null)
                {
                    var bytes = format == "png"
                        ? await PngExporter.ExportAsync(result, cancellationToken)
                        : Utf8WithoutBom.GetBytes(result.Text + '\n');
                    if (output is not null)
                    {
                        await File.WriteAllBytesAsync(output.FullName, bytes, cancellationToken);
                    }
                    else
                    {
                        var generatedOutput = await WriteGeneratedOutputAsync(
                            input, outputDirectory!, bytes, format, cancellationToken);
                        Console.OutputEncoding = Utf8WithoutBom;
                        Console.Out.WriteLine($"Saved: {generatedOutput.FullName}");
                    }
                }
                else
                {
                    Console.OutputEncoding = Utf8WithoutBom;
                    Console.Out.WriteLine(result.Text);
                }

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

    private static async Task<FileInfo> WriteGeneratedOutputAsync(
        FileInfo input,
        DirectoryInfo outputDirectory,
        byte[] bytes,
        string format,
        CancellationToken cancellationToken)
    {
        var outputName = Path.GetFileNameWithoutExtension(input.Name);

        for (var index = 0; ; index++)
        {
            var suffix = index == 0 ? string.Empty : $"-{index}";
            var outputPath = Path.Combine(outputDirectory.FullName, $"{outputName}{suffix}.{format}");
            FileStream outputStream;

            try
            {
                outputStream = new FileStream(
                    outputPath,
                    new FileStreamOptions
                    {
                        Mode = FileMode.CreateNew,
                        Access = FileAccess.Write,
                        Share = FileShare.None,
                        Options = FileOptions.Asynchronous
                    });
            }
            catch (IOException) when (File.Exists(outputPath))
            {
                continue;
            }

            await using (outputStream)
            {
                await outputStream.WriteAsync(bytes, cancellationToken);
            }

            return new FileInfo(outputPath);
        }
    }
}
