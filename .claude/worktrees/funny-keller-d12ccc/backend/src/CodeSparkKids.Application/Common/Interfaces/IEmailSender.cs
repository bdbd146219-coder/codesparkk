namespace CodeSparkKids.Application.Common.Interfaces;

/// <summary>
/// Outbound email gateway. Implementations are responsible for templating
/// and delivery. The application layer passes raw values (token, userId,
/// recipient) and the implementation owns the message body.
/// </summary>
public interface IEmailSender
{
    Task SendEmailVerificationAsync(string toEmail, Guid userId, string token, string preferredLocale, CancellationToken cancellationToken = default);
    Task SendPasswordResetAsync(string toEmail, Guid userId, string token, string preferredLocale, CancellationToken cancellationToken = default);
    Task SendPasswordResetConfirmationAsync(string toEmail, string preferredLocale, CancellationToken cancellationToken = default);
}
