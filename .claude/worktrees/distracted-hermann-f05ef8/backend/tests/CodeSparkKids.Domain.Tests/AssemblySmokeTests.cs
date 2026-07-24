using CodeSparkKids.Domain;

namespace CodeSparkKids.Domain.Tests;

public class AssemblySmokeTests
{
    [Fact]
    public void Domain_Assembly_IsLoadable()
    {
        var assembly = typeof(AssemblyMarker).Assembly;
        Assert.NotNull(assembly);
        Assert.Equal("CodeSparkKids.Domain", assembly.GetName().Name);
    }
}
