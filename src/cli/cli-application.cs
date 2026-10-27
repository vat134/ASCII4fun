using System.CommandLine;

namespace Ascii4Fun.Cli;

internal static class CliApplication
{
    public static Task<int> RunAsync(string[] args)
    {
        var rootCommand = new RootCommand("Convert images and text into ASCII art.");
        rootCommand.Subcommands.Add(ConvertImageCommand.Create());

        var parserConfiguration = new ParserConfiguration
        {
            ResponseFileTokenReplacer = null
        };

        return rootCommand.Parse(args, parserConfiguration).InvokeAsync();
    }
}
