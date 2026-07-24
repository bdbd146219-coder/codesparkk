using CodeSparkKids.Application.Common.Media;

namespace CodeSparkKids.Application.Tests;

public class CatalogMediaKeyTests
{
    [Theory]
    [InlineData("courses/python/thumb.png", "image/png")]
    [InlineData("paths/junior/thumb.PNG", "image/png")]
    [InlineData("a.jpg", "image/jpeg")]
    [InlineData("a.jpeg", "image/jpeg")]
    [InlineData("nested/dir/photo.webp", "image/webp")]
    [InlineData("banner.gif", "image/gif")]
    public void TryResolve_AcceptsSafeImageKeys(string key, string expectedContentType)
    {
        var ok = CatalogMediaKey.TryResolve(key, out var normalized, out var contentType);

        Assert.True(ok);
        Assert.Equal(key, normalized);
        Assert.Equal(expectedContentType, contentType);
    }

    [Theory]
    // Empty / whitespace
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    // Traversal
    [InlineData("../secret.png")]
    [InlineData("courses/../../secret.png")]
    [InlineData("..%2Fsecret.png")] // literal (routing may also pre-decode; both are rejected)
    // Absolute / rooted / scheme / protocol-relative
    [InlineData("/etc/passwd")]
    [InlineData("C:\\secret.png")]
    [InlineData("https://example.com/x.png")]
    [InlineData("http://example.com/x.png")]
    [InlineData("//example.com/x.png")]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:image/png;base64,AAAA")]
    [InlineData("file:///etc/passwd")]
    // Separator / segment problems
    [InlineData("folder\\file.png")]
    [InlineData("courses//thumb.png")]
    [InlineData("courses/thumb.png/")]
    // Unsupported / missing extension (SVG intentionally excluded)
    [InlineData("notes.txt")]
    [InlineData("page.html")]
    [InlineData("icon.svg")]
    [InlineData("thumb")]
    [InlineData(".png")]
    public void TryResolve_RejectsUnsafeOrUnsupportedKeys(string? key)
    {
        var ok = CatalogMediaKey.TryResolve(key, out var normalized, out var contentType);

        Assert.False(ok);
        Assert.Equal(string.Empty, normalized);
        Assert.Equal(string.Empty, contentType);
    }

    [Fact]
    public void TryResolve_RejectsNulByteAndControlCharacters()
    {
        Assert.False(CatalogMediaKey.TryResolve("thumb\0.png", out _, out _));
        Assert.False(CatalogMediaKey.TryResolve("thumb\n.png", out _, out _));
        Assert.False(CatalogMediaKey.TryResolve("thumb\t.png", out _, out _));
    }

    [Fact]
    public void TryResolve_RejectsOverlongKeys()
    {
        var longKey = new string('a', CatalogMediaKey.MaxLength + 1) + ".png";

        Assert.False(CatalogMediaKey.TryResolve(longKey, out _, out _));
    }
}
