namespace CodeSparkKids.Infrastructure.Email;

/// <summary>
/// Builds the subject + HTML body for the dev-time email senders. Plain
/// HTML, inline styles only, no external assets (so it renders identically
/// in smtp4dev / Papercut / any real client).
/// Localised copy lands in a later phase — for now both locales receive
/// the English copy. The chosen locale still threads through so the
/// frontend's verification page can pick the right UI translation.
/// </summary>
internal static class EmailTemplates
{
    private const string Brand = "Code Spark Kids";

    public static (string Subject, string Html) EmailVerification(string url, string locale) =>
        ("Verify your email — Code Spark Kids",
         Layout(
             title: "Verify your email",
             intro: "Welcome to Code Spark Kids. To finish setting up your account, please verify this email address.",
             ctaLabel: "Verify email",
             ctaUrl: url,
             footnote: "If you did not create an account, you can safely ignore this message — the address will not be activated.",
             locale: locale));

    public static (string Subject, string Html) PasswordReset(string url, string locale) =>
        ("Reset your password — Code Spark Kids",
         Layout(
             title: "Reset your password",
             intro: "We received a request to reset the password for your Code Spark Kids account. Use the button below to choose a new password.",
             ctaLabel: "Reset password",
             ctaUrl: url,
             footnote: "If you did not request this, you can ignore this email. The link expires in 24 hours.",
             locale: locale));

    public static (string Subject, string Html) PasswordResetConfirmation(string locale) =>
        ("Your password was reset — Code Spark Kids",
         Layout(
             title: "Your password was reset",
             intro: "This is a confirmation that the password for your Code Spark Kids account has just been changed. All of your active sessions have been signed out.",
             ctaLabel: null,
             ctaUrl: null,
             footnote: "If this was not you, please reset your password again immediately and contact support.",
             locale: locale));

    private static string Layout(string title, string intro, string? ctaLabel, string? ctaUrl, string footnote, string locale)
    {
        var dir = locale == "ar" ? "rtl" : "ltr";
        var ctaHtml = ctaLabel is not null && ctaUrl is not null
            ? $"""
              <p style="margin:24px 0;text-align:center;">
                <a href="{HtmlEscape(ctaUrl)}"
                   style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;
                          font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">
                  {HtmlEscape(ctaLabel)}
                </a>
              </p>
              <p style="margin:8px 0;font-size:12px;color:#6b7280;">
                Or copy this link into your browser:
                <br/>
                <span style="word-break:break-all;color:#1f2937;">{HtmlEscape(ctaUrl)}</span>
              </p>
              """
            : "";

        return $"""
               <!doctype html>
               <html lang="{locale}" dir="{dir}">
                 <head>
                   <meta charset="utf-8" />
                   <title>{HtmlEscape(title)}</title>
                 </head>
                 <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
                   <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
                     <tr>
                       <td align="center">
                         <table role="presentation" width="560" cellpadding="0" cellspacing="0"
                                style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
                           <tr>
                             <td style="font-size:14px;font-weight:600;color:#5b21b6;letter-spacing:.06em;text-transform:uppercase;">
                               {HtmlEscape(Brand)}
                             </td>
                           </tr>
                           <tr>
                             <td style="padding-top:8px;font-size:22px;font-weight:700;color:#0f172a;">
                               {HtmlEscape(title)}
                             </td>
                           </tr>
                           <tr>
                             <td style="padding-top:12px;font-size:15px;line-height:1.6;color:#1f2937;">
                               {HtmlEscape(intro)}
                             </td>
                           </tr>
                           <tr><td>{ctaHtml}</td></tr>
                           <tr>
                             <td style="padding-top:16px;font-size:12px;color:#6b7280;line-height:1.55;border-top:1px solid #e2e8f0;margin-top:24px;">
                               {HtmlEscape(footnote)}
                             </td>
                           </tr>
                         </table>
                         <div style="padding-top:16px;font-size:11px;color:#94a3b8;">
                           {HtmlEscape(Brand)} — premium coding for ages 6 to 16.
                         </div>
                       </td>
                     </tr>
                   </table>
                 </body>
               </html>
               """;
    }

    private static string HtmlEscape(string value) =>
        System.Net.WebUtility.HtmlEncode(value);

    public static string BuildVerificationUrl(string frontendBaseUrl, Guid userId, string rawToken) =>
        BuildAuthLink(frontendBaseUrl, "/auth/verify-email", userId, rawToken);

    public static string BuildPasswordResetUrl(string frontendBaseUrl, Guid userId, string rawToken) =>
        BuildAuthLink(frontendBaseUrl, "/auth/reset-password", userId, rawToken);

    private static string BuildAuthLink(string frontendBaseUrl, string path, Guid userId, string rawToken)
    {
        var baseUrl = string.IsNullOrWhiteSpace(frontendBaseUrl) ? "http://localhost:5173" : frontendBaseUrl.TrimEnd('/');
        var encoded = Uri.EscapeDataString(rawToken);
        return $"{baseUrl}{path}?userId={userId:D}&token={encoded}";
    }
}
