using CodeSparkKids.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace CodeSparkKids.Infrastructure.Email;

/// <summary>
/// Default email sender used in tests and during local development when no
/// real SMTP is configured. Logs a redacted summary and accepts the call.
/// **Never** logs the raw token.
/// </summary>
public sealed class NoOpEmailSender(ILogger<NoOpEmailSender> log) : IEmailSender
{
    public Task SendEmailVerificationAsync(string toEmail, Guid userId, string token, string preferredLocale, CancellationToken cancellationToken = default)
    {
        log.LogInformation("[NoOpEmailSender] verification email to {Email} (user {UserId}, locale {Locale}, token len {Len})",
            toEmail, userId, preferredLocale, token.Length);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetAsync(string toEmail, Guid userId, string token, string preferredLocale, CancellationToken cancellationToken = default)
    {
        log.LogInformation("[NoOpEmailSender] password reset to {Email} (user {UserId}, locale {Locale}, token len {Len})",
            toEmail, userId, preferredLocale, token.Length);
        return Task.CompletedTask;
    }

    public Task SendPasswordResetConfirmationAsync(string toEmail, string preferredLocale, CancellationToken cancellationToken = default)
    {
        log.LogInformation("[NoOpEmailSender] password-reset confirmation to {Email} (locale {Locale})",
            toEmail, preferredLocale);
        return Task.CompletedTask;
    }
}
