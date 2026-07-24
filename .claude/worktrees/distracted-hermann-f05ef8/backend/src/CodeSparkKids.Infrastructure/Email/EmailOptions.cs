namespace CodeSparkKids.Infrastructure.Email;

/// <summary>
/// Outbound email configuration. Bound from the <c>Email</c> section in
/// configuration. Default <see cref="Provider"/> is <c>"noop"</c> so the
/// API can boot without any SMTP setup. Set <c>"smtp"</c> in
/// <c>appsettings.Development.json</c> (or via environment variables) to
/// route through <see cref="SmtpEmailSender"/>.
/// </summary>
public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary><c>"noop"</c> (default) or <c>"smtp"</c>. Production provider deferred.</summary>
    public string Provider { get; set; } = "noop";

    /// <summary>Base URL of the frontend, used to build verification / reset links in emails.</summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";

    public string FromEmail { get; set; } = "no-reply@codesparkkids.local";
    public string FromName { get; set; } = "Code Spark Kids";

    public SmtpSettings Smtp { get; set; } = new();

    public sealed class SmtpSettings
    {
        /// <summary>Hostname of the SMTP relay. Defaults to the local catcher.</summary>
        public string Host { get; set; } = "localhost";

        /// <summary>
        /// SMTP port. 2525 is a common dev-catcher default (smtp4dev / Papercut)
        /// because port 25 is frequently blocked. Adjust to match your tool.
        /// </summary>
        public int Port { get; set; } = 2525;

        public bool UseSsl { get; set; } = false;

        /// <summary>Optional. Leave null/empty for an anonymous local catcher.</summary>
        public string? Username { get; set; }

        /// <summary>Optional. Loaded from env / user-secrets — NEVER from source.</summary>
        public string? Password { get; set; }

        public int TimeoutMs { get; set; } = 10_000;
    }
}
