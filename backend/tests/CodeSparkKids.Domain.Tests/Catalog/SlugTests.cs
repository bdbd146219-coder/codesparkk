using CodeSparkKids.Domain.Catalog;

namespace CodeSparkKids.Domain.Tests.Catalog;

public class SlugTests
{
    [Theory]
    [InlineData("Scratch Adventures", "scratch-adventures")]
    [InlineData("  Python: First Steps!  ", "python-first-steps")]
    [InlineData("AI for Kids  ", "ai-for-kids")]
    [InlineData("Already-valid-slug", "already-valid-slug")]
    [InlineData("multiple   spaces__and--dashes", "multiple-spaces-and-dashes")]
    public void Normalize_produces_clean_slugs(string input, string expected) =>
        Assert.Equal(expected, Slug.Normalize(input));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("!!!")]      // normalises to empty
    [InlineData("عربي")]     // non-ASCII stripped -> empty
    public void Normalize_throws_when_result_is_empty(string? input) =>
        Assert.Throws<ArgumentException>(() => Slug.Normalize(input));

    [Theory]
    [InlineData("scratch-adventures", true)]
    [InlineData("python", true)]
    [InlineData("Bad Slug", false)]
    [InlineData("-leading", false)]
    [InlineData("trailing-", false)]
    [InlineData("double--hyphen", false)]
    public void IsValid_matches_slug_rules(string slug, bool expected) =>
        Assert.Equal(expected, Slug.IsValid(slug));
}
