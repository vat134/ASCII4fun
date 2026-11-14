using System.Text;
using Ascii4Fun.Cli;
using Ascii4Fun.Images;

namespace Ascii4Fun.Tests;

public sealed class ImageOutputTests
{
    [Fact]
    public async Task CancelledGeneratedOutputIsRemovedAndCanBeRetriedWithoutReplacingExistingFiles()
    {
        var directory = Directory.CreateTempSubdirectory("ascii4fun-output-");
        try
        {
            var input = new FileInfo(Path.Combine(directory.FullName, "photo.png"));
            var existingPath = Path.Combine(directory.FullName, "photo.txt");
            var generatedPath = Path.Combine(directory.FullName, "photo-1.txt");
            await File.WriteAllTextAsync(existingPath, "existing art");
            var canvas = new AsciiCanvas([new AsciiCell(new Rune('@'), new RgbColor(255, 255, 255))], 1, 1);
            using var cancellation = new CancellationTokenSource();
            cancellation.Cancel();

            await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
                ImageOutput.WriteAsync(canvas, input, null, directory, "txt", cancellation.Token));

            Assert.False(File.Exists(generatedPath));
            Assert.Equal("existing art", await File.ReadAllTextAsync(existingPath));
            await ImageOutput.WriteAsync(canvas, input, null, directory, "txt", CancellationToken.None);
            Assert.Equal("@\n", await File.ReadAllTextAsync(generatedPath));
            Assert.Equal("existing art", await File.ReadAllTextAsync(existingPath));
            Assert.Equal(2, directory.EnumerateFiles().Count());
        }
        finally
        {
            directory.Delete(recursive: true);
        }
    }
}
