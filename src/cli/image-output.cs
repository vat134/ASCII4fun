using System.Text;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Cli;

internal static class ImageOutput
{
    private static readonly UTF8Encoding Utf8WithoutBom = new(encoderShouldEmitUTF8Identifier: false);

    public static async Task WriteAsync(AsciiCanvas canvas, FileInfo input, FileInfo? output,
        DirectoryInfo? outputDirectory, string format, CancellationToken cancellationToken)
    {
        if (output is null && outputDirectory is null)
        {
            Console.OutputEncoding = Utf8WithoutBom;
            Console.Out.WriteLine(canvas.Text);
            return;
        }

        var bytes = format == "png"
            ? await PngExporter.ExportAsync(canvas, cancellationToken)
            : Utf8WithoutBom.GetBytes(canvas.Text + '\n');
        if (output is not null)
        {
            await File.WriteAllBytesAsync(output.FullName, bytes, cancellationToken);
            return;
        }

        if (outputDirectory is not null)
        {
            var generatedOutput = await WriteGeneratedAsync(input, outputDirectory, bytes, format, cancellationToken);
            Console.OutputEncoding = Utf8WithoutBom;
            Console.Out.WriteLine($"Saved: {generatedOutput.FullName}");
        }
    }

    private static async Task<FileInfo> WriteGeneratedAsync(FileInfo input, DirectoryInfo outputDirectory,
        byte[] bytes, string format, CancellationToken cancellationToken)
    {
        var outputName = Path.GetFileNameWithoutExtension(input.Name);
        for (var index = 0; ; index++)
        {
            var suffix = index == 0 ? string.Empty : $"-{index}";
            var outputPath = Path.Combine(outputDirectory.FullName, $"{outputName}{suffix}.{format}");
            FileStream outputStream;
            try
            {
                outputStream = new FileStream(outputPath, new FileStreamOptions
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
