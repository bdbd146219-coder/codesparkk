namespace CodeSparkKids.Infrastructure.Identity;

internal static class DeviceLabel
{
    /// <summary>Best-effort browser / OS extraction from a UA string. Truncated to 80 chars.</summary>
    public static string? From(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent)) return null;

        string browser = "Browser";
        if (userAgent.Contains("Edg/", StringComparison.OrdinalIgnoreCase)) browser = "Edge";
        else if (userAgent.Contains("Chrome/", StringComparison.OrdinalIgnoreCase)) browser = "Chrome";
        else if (userAgent.Contains("Firefox/", StringComparison.OrdinalIgnoreCase)) browser = "Firefox";
        else if (userAgent.Contains("Safari/", StringComparison.OrdinalIgnoreCase)) browser = "Safari";

        string os = "Unknown";
        if (userAgent.Contains("Windows", StringComparison.OrdinalIgnoreCase)) os = "Windows";
        else if (userAgent.Contains("Macintosh", StringComparison.OrdinalIgnoreCase) || userAgent.Contains("Mac OS X", StringComparison.OrdinalIgnoreCase)) os = "macOS";
        else if (userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase)) os = "iOS";
        else if (userAgent.Contains("iPad", StringComparison.OrdinalIgnoreCase)) os = "iPadOS";
        else if (userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase)) os = "Android";
        else if (userAgent.Contains("Linux", StringComparison.OrdinalIgnoreCase)) os = "Linux";

        var label = $"{browser} on {os}";
        return label.Length > 80 ? label[..80] : label;
    }
}
