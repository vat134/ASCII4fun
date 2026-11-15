using System.Text;

namespace Ascii4Fun.Compact;

/// <summary>A destination field and its recommended Braille geometry. Widths are estimates, not calibrated device guarantees.</summary>
public sealed record CompactDestination(string Id, string Name, string Platform, int? Limit, string Unit,
    int RecommendedColumns, double CellAspectRatio, bool Flow = false);

/// <summary>Exact destination text, its budget and advisory rendering limits.</summary>
public sealed record CompactArtPayload(string Text, int Count, int? Limit, string Unit,
    bool Fits, int RecommendedColumns, string[] Warnings);

/// <summary>Typist-derived destination recommendations and explicit payload formatting.</summary>
public static class CompactDestinations
{
    /// <summary>The supported fields; Steam alone offers multiple field presets.</summary>
    public static IReadOnlyList<CompactDestination> All { get; } = Array.AsReadOnly<CompactDestination>([
        new("steamc", "Comment", "Steam", 1000, "bytes", 48, .753 / 1.4),
        new("steamp", "Summary", "Steam", 4000, "bytes", 48, .753 / 1.4),
        new("steamb", "Info box", "Steam", 8000, "bytes", 60, .753 / 1.4),
        new("tg", "Message", "Telegram", 4096, "characters", 24, .75 / 1.3),
        new("twitch", "Chat", "Twitch", 500, "characters", 32, .75 / 1.54, Flow: true),
        new("plain", "File", "File", null, "characters", 48, .5)
    ]);

    /// <summary>Finds a supported field; unknown IDs fail explicitly.</summary>
    public static CompactDestination Get(string id) => All.FirstOrDefault(item => item.Id == id)
        ?? throw new ArgumentException("Choose a supported mini-art destination.", nameof(id));

    internal static int Rows(int columns, double cellAspect, double cropAspect) =>
        Math.Max(1, (int)Math.Floor(columns * cellAspect / cropAspect + .5));

    internal static int Count(int columns, int rows, CompactDestination destination) => destination.Unit switch
    {
        "bytes" => checked(3 * columns * rows + rows - 1),
        _ when destination.Flow => checked((rows + 1) * columns + rows),
        _ => checked(columns * rows + rows - 1)
    };

    internal static int AutoColumns(CompactDestination destination, double cropAspect)
    {
        for (var columns = destination.RecommendedColumns; columns >= 4; columns--)
            if (destination.Limit is null || Count(columns, Rows(columns, destination.CellAspectRatio, cropAspect), destination) <= destination.Limit)
                return columns;
        return 4;
    }

    /// <summary>Formats a rectangular clean Braille grid for one destination. Does not alter the canvas.</summary>
    public static CompactArtPayload Format(string text, int columns, int rows, string destinationId)
    {
        ArgumentNullException.ThrowIfNull(text);
        var destination = Get(destinationId);
        if (columns is < 1 or > 200 || rows < 1 || (long)columns * rows > CompactArtGeometry.MaxCells)
            throw new ArgumentOutOfRangeException(nameof(columns));
        var lines = text.Split('\n');
        if (lines.Length != rows || lines.Any(line => line.Length != columns || line.Any(glyph => glyph is < '\u2800' or > '\u28ff')))
            throw new ArgumentException("The destination payload requires a rectangular Braille grid.", nameof(text));
        var body = destination.Flow ? new string('\u2800', columns) + " " + string.Join(' ', lines)
            : text;
        var count = destination.Unit switch
        {
            "bytes" => Encoding.UTF8.GetByteCount(body),
            _ => body.Length
        };
        var warnings = new List<string>();
        if (destination.Limit is not null && count > destination.Limit) warnings.Add("Over the field limit. Use Auto or fewer columns before copying.");
        if (columns > destination.RecommendedColumns) warnings.Add("Wider than the recommended text area; rows may wrap.");
        if (destination.Flow) warnings.Add("One chat message: rows stack through word wrapping. Chat width, username and channel moderation can change the result.");
        if (destinationId != "plain") warnings.Add("Preview is an estimate. Destination fonts and window widths can change spacing; clean blank cells may be narrower on Windows.");
        var cropAspect = columns * destination.CellAspectRatio / rows;
        return new CompactArtPayload(body, count, destination.Limit, destination.Unit, destination.Limit is null || count <= destination.Limit,
            AutoColumns(destination, cropAspect), warnings.ToArray());
    }
}
