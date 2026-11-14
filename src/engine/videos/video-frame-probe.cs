using System.Globalization;
using System.Text;

namespace Ascii4Fun.Videos;

internal static class VideoFrameProbe
{
    internal static async Task<(double DurationSeconds, double StartTimeSeconds, int FrameCount, double FramesPerSecond)> ReadAsync(
        string path, string timeBase, VideoTools tools, CancellationToken token)
    {
        var ratio = timeBase.Split('/');
        var numerator = int.Parse(ratio[0], CultureInfo.InvariantCulture);
        var denominator = int.Parse(ratio[1], CultureInfo.InvariantCulture);
        if (numerator <= 0 || denominator <= 0)
            throw new InvalidDataException("The video time base is invalid.");
        await using var probe = new FfmpegProcess(tools.FfprobePath,
            ["-v", "error", "-protocol_whitelist", "file,pipe", "-format_whitelist", "mov,matroska,webm", "-max_pixels", VideoClip.MaxSourcePixels.ToString(CultureInfo.InvariantCulture),
                "-select_streams", "v:0", "-show_frames", "-show_entries", "frame=best_effort_timestamp,duration:frame_side_data=", "-of", "compact=p=1:nk=0", path], token);
        using var reader = new StreamReader(probe.Output);
        var buffer = new char[4096];
        var record = new StringBuilder(512);
        var minimum = decimal.MaxValue;
        var maximum = decimal.MinValue;
        var frameCount = 0;
        var characters = 0;
        int read;
        while ((read = await reader.ReadAsync(buffer.AsMemory(), token)) > 0)
        {
            characters += read;
            if (characters > 1024 * 1024)
                throw new InvalidDataException("The video frame metadata exceeds the supported size.");
            for (var index = 0; index < read; index++)
            {
                var character = buffer[index];
                if (character == '\n')
                {
                    ReadRecord();
                    record.Clear();
                }
                else
                {
                    if (record.Length == 512)
                        throw new InvalidDataException("The video frame metadata record exceeds the supported size.");
                    record.Append(character);
                }
            }
        }
        if (record.Length > 0) ReadRecord();
        await probe.CompleteAsync(token);
        if (frameCount == 0)
            throw new InvalidDataException("The video contains no timed video frames.");
        var durationSeconds = (maximum - minimum) * numerator / denominator;
        if (frameCount * (decimal)denominator > 60 * (maximum - minimum) * numerator)
            throw new InvalidDataException("Video supports up to 60 source FPS.");
        return ((double)durationSeconds, (double)(minimum * numerator / denominator), frameCount, (double)(frameCount / durationSeconds));

        void ReadRecord()
        {
            var line = record.ToString().TrimEnd('\r');
            if (line.Length == 0) return;
            var fields = line.Split('|');
            if (fields[0] != "frame") throw new InvalidDataException("The video frame timing is incomplete or invalid.");
            if (++frameCount > 3600) throw new InvalidDataException("Video supports up to 3,600 source frames.");
            long? pts = null;
            long? duration = null;
            for (var index = 1; index < fields.Length; index++)
            {
                var field = fields[index];
                // ffprobe leaves an empty trailing field for suppressed frame side data.
                if (field.Length == 0 && index == fields.Length - 1) continue;
                var pair = field.Split('=');
                if (pair.Length != 2 || !long.TryParse(pair[1], NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var value))
                    throw new InvalidDataException("The video frame timing is incomplete or invalid.");
                if (pair[0] == "best_effort_timestamp" && pts is null) pts = value;
                else if (pair[0] == "duration" && duration is null) duration = value;
                else throw new InvalidDataException("The video frame timing is incomplete or invalid.");
            }
            if (pts is null or long.MinValue || duration is null or <= 0)
                throw new InvalidDataException("The video frame timing is incomplete or invalid.");
            minimum = Math.Min(minimum, pts.Value);
            maximum = Math.Max(maximum, (decimal)pts.Value + duration.Value);
            if ((maximum - minimum) * numerator > 60 * (decimal)denominator)
                throw new InvalidDataException("Choose a video no longer than 60 seconds. Longer clips are not trimmed automatically.");
        }
    }
}
