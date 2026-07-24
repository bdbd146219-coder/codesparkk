using System.Collections.Concurrent;
using CodeSparkKids.Application.Common.Interfaces;

namespace CodeSparkKids.Api.IntegrationTests.Support;

/// <summary>Captures every outbound email so tests can assert on them.</summary>
public sealed class TrackingEmailSender : IEmailSender
{
    public ConcurrentBag<EmailRecord> Records { get; } = new();

    public Task SendEmailVerificationAsync(string toEmail, Guid userId, string token, string preferredLocale, CancellationToken cancellationToken = default)
    {
        Records.Add(new EmailRecord("verification", toEmail, userId, token, preferredLocale));
        return Task.CompletedTask;
    }

    public Task SendPasswordResetAsync(string toEmail, Guid userId, string token, string preferredLocale, CancellationToken cancellationToken = default)
    {
        Records.Add(new EmailRecord("reset", toEmail, userId, token, preferredLocale));
        return Task.CompletedTask;
    }

    public Task SendPasswordResetConfirmationAsync(string toEmail, string preferredLocale, CancellationToken cancellationToken = default)
    {
        Records.Add(new EmailRecord("reset-confirm", toEmail, null, null, preferredLocale));
        return Task.CompletedTask;
    }

    public void Reset() => Records.Clear();

    public EmailRecord? LastVerification(string email) =>
        Records.Where(r => r.Kind == "verification" && r.ToEmail.Equals(email, StringComparison.OrdinalIgnoreCase))
               .OrderBy(r => r.At).LastOrDefault();

    public EmailRecord? LastReset(string email) =>
        Records.Where(r => r.Kind == "reset" && r.ToEmail.Equals(email, StringComparison.OrdinalIgnoreCase))
               .OrderBy(r => r.At).LastOrDefault();
}

public sealed record EmailRecord(string Kind, string ToEmail, Guid? UserId, string? Token, string PreferredLocale)
{
    public DateTime At { get; } = DateTime.UtcNow;
}
