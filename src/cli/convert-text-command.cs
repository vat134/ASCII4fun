using System.CommandLine;
using System.Text;
using Ascii4Fun.Figlet;
using Ascii4Fun.Images;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Cli;

internal static class ConvertTextCommand
{
    public static Command Create()
    {
        var text = new Argument<string>("text") { Description = "Text to render, including quoted line breaks." };
        var font = new Option<string>("--font") { DefaultValueFactory = _ => "standard", Description = "Bundled font ID from list-fonts." };
        var color = new Option<string?>("--color") { Description = "Override glyph foreground with #RRGGBB; omitted preserves font colors." };
        var replacements = new Option<string[]>("--replace-color") { Description = "Replace an authored color: #RRGGBB=#RRGGBB. Repeat for more colors." };
        var format = new Option<string>("--format") { DefaultValueFactory = _ => "txt", Description = "Output format: txt or png." };
        format.AcceptOnlyFromAmong("txt", "png");
        var output = new Option<FileInfo?>("--output") { Description = "Write a file; required for PNG. TXT otherwise uses stdout." };
        output.Aliases.Add("-o");
        var command = new Command("convert-text", "Render text with a bundled FIGlet or TheDraw font.")
        {
            text, font, color, replacements, format, output
        };
        command.Validators.Add(result =>
        {
            if (result.GetResult(format)?.Tokens.Any(token => token.Value == "png") == true
                && result.GetResult(output) is null)
                result.AddError("PNG requires --output.");
        });
        command.SetAction(async (result, cancellationToken) =>
        {
            try
            {
                var palette = new Dictionary<RgbColor, RgbColor>();
                foreach (var replacement in result.GetValue(replacements) ?? [])
                {
                    var pair = replacement.Split('=');
                    if (pair.Length != 2)
                        throw new ArgumentException("Use --replace-color #RRGGBB=#RRGGBB.");
                    if (!palette.TryAdd(RgbColor.ParseHex(pair[0]), RgbColor.ParseHex(pair[1])))
                        throw new ArgumentException("Specify each original color only once.");
                }
                var foreground = result.GetValue(color);
                var canvas = FigletConverter.Convert(result.GetRequiredValue(text), result.GetRequiredValue(font),
                    foreground is null ? null : RgbColor.ParseHex(foreground), palette, cancellationToken);
                var destination = result.GetValue(output);
                if (destination is null)
                {
                    Console.OutputEncoding = new UTF8Encoding(false);
                    Console.Out.Write(canvas.Text);
                }
                else
                {
                    var bytes = result.GetValue(format) == "png"
                        ? await PngExporter.ExportAsync(canvas, cancellationToken)
                        : Encoding.UTF8.GetBytes(canvas.Text);
                    await File.WriteAllBytesAsync(destination.FullName, bytes, cancellationToken);
                }
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

    public static Command CreateFontList()
    {
        var command = new Command("list-fonts", "List bundled text font IDs, names and categories.");
        command.SetAction(_ =>
        {
            Console.OutputEncoding = new UTF8Encoding(false);
            foreach (var font in FigletConverter.Fonts)
                Console.Out.WriteLine($"{font.Id}\t{font.Name}\t{font.Category}");
            return 0;
        });
        return command;
    }
}
