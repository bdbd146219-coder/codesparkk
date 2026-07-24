using CodeSparkKids.Domain.ValueObjects;

namespace CodeSparkKids.Domain.Tests.Catalog;

public class LocalizedTextTests
{
    [Fact]
    public void Resolve_returns_requested_language_when_present()
    {
        var text = LocalizedText.Create("Hello", "مرحبا");
        Assert.Equal("Hello", text.Resolve("en"));
        Assert.Equal("مرحبا", text.Resolve("ar"));
        Assert.Equal("مرحبا", text.Resolve("ar-SA"));
    }

    [Fact]
    public void Resolve_falls_back_to_other_language_when_requested_is_empty()
    {
        var englishOnly = LocalizedText.Create("Hello", "");
        Assert.Equal("Hello", englishOnly.Resolve("ar")); // falls back to En

        var arabicOnly = LocalizedText.Create("", "مرحبا");
        Assert.Equal("مرحبا", arabicOnly.Resolve("en")); // falls back to Ar
    }

    [Fact]
    public void Create_trims_and_reports_completeness()
    {
        var text = LocalizedText.Create("  Hi  ", "  أهلا  ");
        Assert.Equal("Hi", text.En);
        Assert.Equal("أهلا", text.Ar);
        Assert.True(text.IsComplete);

        Assert.False(LocalizedText.Create("Hi", "").IsComplete);
        Assert.True(LocalizedText.Create("Hi", "").HasAny);
        Assert.False(LocalizedText.Empty.HasAny);
    }

    [Fact]
    public void Equality_is_value_based()
    {
        Assert.Equal(LocalizedText.Create("a", "ب"), LocalizedText.Create("a", "ب"));
        Assert.NotEqual(LocalizedText.Create("a", "ب"), LocalizedText.Create("a", "ت"));
    }
}
