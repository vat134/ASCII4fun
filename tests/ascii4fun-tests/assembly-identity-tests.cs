using System.Reflection;

namespace Ascii4Fun.Tests;

public sealed class AssemblyIdentityTests
{
    [Fact]
    public void EngineAssemblyUsesStableName()
    {
        var assembly = Assembly.Load("Ascii4Fun");

        Assert.Equal("Ascii4Fun", assembly.GetName().Name);
    }
}

