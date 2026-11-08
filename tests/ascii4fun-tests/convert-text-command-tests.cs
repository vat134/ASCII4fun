using System.Text;
using System.Diagnostics;
using Ascii4Fun.Cli;
using Ascii4Fun.Figlet;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Tests;

public sealed class ConvertTextCommandTests
{
    [Theory]
    [InlineData("standard", "txt")]
    [InlineData("small-braille", "txt")]
    [InlineData("tdf-colorrounded", "png")]
    public async Task WritesEngineOutput(string fontId, string format)
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-text-");
        try
        {
            var path = Path.Combine(directory.FullName, $"text.{format}");
            Assert.Equal(0, await CliApplication.RunAsync(["convert-text", "ASCII\nText", "--font", fontId,
                "--replace-color", "#FFFFFF=#00FFAA", "--format", format, "--output", path]));
            var expected = FigletConverter.Convert("ASCII\nText", fontId,
                colorReplacements: new Dictionary<RgbColor, RgbColor> { [new(255, 255, 255)] = new(0, 255, 170) });
            var bytes = format == "png" ? await PngExporter.ExportAsync(expected) : Encoding.UTF8.GetBytes(expected.Text);
            Assert.Equal(bytes, await File.ReadAllBytesAsync(path));
        }
        finally { directory.Delete(recursive: true); }
    }

    [Theory]
    [InlineData("--font", "missing")]
    [InlineData("--color", "red")]
    [InlineData("--format", "pdf")]
    [InlineData("--format", "png")]
    [InlineData("--replace-color", "bad")]
    public async Task RejectsInvalidArguments(string option, string value)
    {
        Assert.Equal(1, await CliApplication.RunAsync(["convert-text", "A", option, value]));
    }

    [Fact]
    public async Task ListsFontsAndWritesExactTextToStdout()
    {
        var fonts = await RunProcessAsync("list-fonts");
        Assert.Equal(0, fonts.ExitCode);
        Assert.Equal(FigletConverter.Fonts.Select(font => $"{font.Id}\t{font.Name}\t{font.Category}"),
            fonts.Output.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries));
        var text = await RunProcessAsync("convert-text", "ASCII\nText");
        Assert.Equal(0, text.ExitCode);
        Assert.Equal(FigletConverter.Convert("ASCII\nText", "standard").Text, text.Output);
    }

    [Fact]
    public async Task RejectsConflictingAndRepeatedColorsAndExcessiveText()
    {
        Assert.Equal(1, await CliApplication.RunAsync(["convert-text", "A", "--color", "#FFFFFF",
            "--replace-color", "#FFFFFF=#000000"]));
        Assert.Equal(1, await CliApplication.RunAsync(["convert-text", "A",
            "--replace-color", "#FFFFFF=#000000", "--replace-color", "#ffffff=#00FF00"]));
        Assert.Equal(1, await CliApplication.RunAsync(["convert-text", new string('A', 257)]));
    }

    private static async Task<(int ExitCode, string Output)> RunProcessAsync(params string[] arguments)
    {
        var start = new ProcessStartInfo("dotnet") { RedirectStandardOutput = true, RedirectStandardError = true };
        start.ArgumentList.Add(typeof(CliApplication).Assembly.Location);
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        using var process = Process.Start(start)!;
        var output = process.StandardOutput.ReadToEndAsync();
        var error = process.StandardError.ReadToEndAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        await process.WaitForExitAsync(timeout.Token);
        Assert.Equal(string.Empty, await error);
        return (process.ExitCode, await output);
    }
}
