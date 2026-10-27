using System.CommandLine;
using System.Text;
using Ascii4Fun.Images;

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

        var outputOption = new Option<FileInfo?>("--output")
        {
            Description = "Write UTF-8 text to a file instead of stdout."
        };
        outputOption.Aliases.Add("-o");

        var outputDirectoryOption = new Option<DirectoryInfo>("--output-directory")
        {
            Description = "Create a UTF-8 text file using the input name in this directory."
        };
        outputDirectoryOption.AcceptExistingOnly();

        var command = new Command("convert-image", "Convert one still image to plain-text ASCII.")
        {
            inputArgument,
            widthOption,
            rampOption,
            invertOption,
            outputOption,
            outputDirectoryOption
        };

        command.Validators.Add(result =>
        {
            if (result.GetValue(outputOption) is not null
                && result.GetValue(outputDirectoryOption) is not null)
            {
                result.AddError("Use either --output or --output-directory, not both.");
            }
        });

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            var input = parseResult.GetRequiredValue(inputArgument);
            var options = new CharacterImageOptions
            {
                OutputWidthInCells = parseResult.GetValue(widthOption),
                CharacterRamp = parseResult.GetRequiredValue(rampOption),
                Invert = parseResult.GetValue(invertOption)
            };

            try
            {
                AsciiText result;

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

                if (output is not null)
                {
                    await File.WriteAllTextAsync(
                        output.FullName,
                        result.Text + '\n',
                        Utf8WithoutBom,
                        cancellationToken);
                }
                else if (outputDirectory is not null)
                {
                    var generatedOutput = await WriteGeneratedOutputAsync(
                        input,
                        outputDirectory,
                        result.Text,
                        cancellationToken);
                    Console.OutputEncoding = Utf8WithoutBom;
                    Console.Out.WriteLine($"Saved: {generatedOutput.FullName}");
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
        string text,
        CancellationToken cancellationToken)
    {
        var outputName = Path.GetFileNameWithoutExtension(input.Name);

        for (var index = 0; ; index++)
        {
            var suffix = index == 0 ? string.Empty : $"-{index}";
            var outputPath = Path.Combine(outputDirectory.FullName, $"{outputName}{suffix}.txt");
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
            await using (var writer = new StreamWriter(outputStream, Utf8WithoutBom))
            {
                await writer.WriteAsync((text + '\n').AsMemory(), cancellationToken);
            }

            return new FileInfo(outputPath);
        }
    }
}
