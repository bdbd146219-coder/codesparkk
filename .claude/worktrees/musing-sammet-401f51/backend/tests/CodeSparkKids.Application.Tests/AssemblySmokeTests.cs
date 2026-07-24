using CodeSparkKids.Application;
using CodeSparkKids.Application.Common.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Application.Tests;

public class AssemblySmokeTests
{
    [Fact]
    public void Application_Assembly_IsLoadable()
    {
        var assembly = typeof(AssemblyMarker).Assembly;
        Assert.Equal("CodeSparkKids.Application", assembly.GetName().Name);
    }

    [Fact]
    public void AddApplication_RegistersMediatorAndValidators_WithoutThrowing()
    {
        var services = new ServiceCollection();
        services.AddApplication();

        using var provider = services.BuildServiceProvider();
        var mediator = provider.GetService<MediatR.IMediator>();

        Assert.NotNull(mediator);
    }

    [Fact]
    public void IFileStorage_InterfaceShape_IsStable()
    {
        var methods = typeof(IFileStorage).GetMethods().Select(m => m.Name).ToHashSet();
        Assert.Contains("SaveAsync", methods);
        Assert.Contains("OpenReadAsync", methods);
        Assert.Contains("DeleteAsync", methods);
        Assert.Contains("ExistsAsync", methods);
    }
}
