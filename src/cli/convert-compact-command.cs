using System.CommandLine;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Ascii4Fun.Compact;
using Ascii4Fun.Rendering;

namespace Ascii4Fun.Cli;

internal static class ConvertCompactCommand
{
    private static readonly JsonSerializerOptions SettingsJson = new(JsonSerializerDefaults.Web)
    { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow };

    public static Command Create()
    {
        var input = new Argument<FileInfo>("input") { Description = "JPEG, PNG or still WebP photo." };
        input.AcceptExistingOnly();
        var settings = new Option<FileInfo?>("--settings") { Description = "CompactArtOptions JSON file (up to 64 KiB); omitted values use engine defaults." };
        var destination = new Option<string?>("--destination") { Description = "Destination field ID, for example steamc, steamp, steamb, tg, twitch or plain." };
        var width = new Option<int?>("--width") { Description = "Manual columns (4..200); zero selects Auto." };
        width.Aliases.Add("-w");
        var format = new Option<string>("--format") { Description = "txt (destination payload) or png (rectangular artwork).", DefaultValueFactory = _ => "txt" };
        format.AcceptOnlyFromAmong("txt", "png");
        var output = new Option<FileInfo?>("--output") { Description = "Write output to this file; required for PNG." };
        output.Aliases.Add("-o");
        var command = new Command("convert-compact", "Convert a photo to compact spatial Braille for a destination.") { input, settings, destination, width, format, output };
        command.Validators.Add(result =>
        {
            if (result.GetResult(format)?.Tokens.Any(token => token.Value == "png") == true && result.GetResult(output) is null)
                result.AddError("PNG requires --output.");
        });
        command.SetAction(async (result, token) =>
        {
            try
            {
                var options = new CompactArtOptions();
                if (result.GetValue(settings) is { } settingsFile)
                {
                    if (settingsFile.Length > 64 * 1024) throw new ArgumentException("Settings must be within 64 KiB.");
                    options = JsonSerializer.Deserialize<CompactArtOptions>(await File.ReadAllTextAsync(settingsFile.FullName, token), SettingsJson)
                        ?? throw new ArgumentException("Settings must be a JSON object.");
                }
                if (result.GetValue(destination) is { } field) options = options with { Destination = field };
                if (result.GetValue(width) is { } columns) options = options with { Columns = columns };
                await using var source = File.OpenRead(result.GetRequiredValue(input).FullName);
                var converted = await new CompactArtConverter().ConvertAsync(source, options, token);
                if (result.GetValue(output) is { } file)
                {
                    var bytes = result.GetValue(format) == "png" ? await PngExporter.ExportAsync(converted.Canvas, token)
                        : Encoding.UTF8.GetBytes(converted.Payload.Text);
                    await File.WriteAllBytesAsync(file.FullName, bytes, token);
                }
                else
                {
                    Console.OutputEncoding = new UTF8Encoding(false);
                    Console.Out.Write(converted.Payload.Text);
                }
                return 0;
            }
            catch (Exception exception) when (exception is ArgumentException or IOException or UnauthorizedAccessException or JsonException)
            {
                Console.Error.WriteLine($"Error: {exception.Message}");
                return 1;
            }
        });
        return command;
    }
}
