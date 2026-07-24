using System.Net;
using System.Net.Mail;
using CodeSparkKids.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Infrastructure.Email;

/// <summary>
/// Development-grade SMTP email sender. Targets a local catcher
/// (smtp4dev / Papercut SMTP) by default. Composes plain-HTML messages
/// via <see cref="EmailTemplates"/>.
///
/// Safety:
/// - Raw verification / reset tokens appear in the email body (that is
///   the purpose of the email) but are NEVER written to application logs.
/// - SMTP credentials, if any, come from <see cref="EmailOptions.SmtpSettings"/>
///   which is sourced from environment / user-secrets — never from source.
/// - Failures are logged at warning level and swallowed: a transient SMTP
///   blip must not propagate as a 500 from /auth/register or /auth/forgot.
/// </summary>
public sealed class SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> log) : IEmailSender
{
    private readonly EmailOptions _options = options.Value;

    public Task SendEmailVerificationAsync(string toEmail, Guid userId, string token, string preferredLocale, CancellationToken cancellationToken = default)
    {
        var url = EmailTemplates.BuildVerificationUrl(_options.FrontendBaseUrl, userId, token);
        var (subject, html) = EmailTemplates.EmailVerification(url, preferredLocale);
        return SendAsync(toEmail, subject, html, "verification", userId, cancellationToken);
    }

    public Task SendPasswordResetAsync(string toEmail, Guid userId, string token, string preferredLocale, CancellationToken cancellationToken = default)
    {
        var url = EmailTemplates.BuildPasswordResetUrl(_options.FrontendBaseUrl, userId, token);
        var (subject, html) = EmailTemplates.PasswordReset(url, preferredLocale);
        return SendAsync(toEmail, subject, html, "reset", userId, cancellationToken);
    }

    public Task SendPasswordResetConfirmationAsync(string toEmail, string preferredLocale, CancellationToken cancellationToken = default)
    {
        var (subject, html) = EmailTemplates.PasswordResetConfirmation(preferredLocale);
        return SendAsync(toEmail, subject, html, "reset-confirm", null, cancellationToken);
    }

    private async Task SendAsync(string toEmail, string subject, string htmlBody, string kind, Guid? userId, CancellationToken cancellationToken)
    {
        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromEmail, _options.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
            BodyEncoding = System.Text.Encoding.UTF8,
            SubjectEncoding = System.Text.Encoding.UTF8,
        };
        message.To.Add(new MailAddress(toEmail));

        using var client = new SmtpClient(_options.Smtp.Host, _options.Smtp.Port)
        {
            EnableSsl = _options.Smtp.UseSsl,
            Timeout = _options.Smtp.TimeoutMs,
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };

        if (!string.IsNullOrEmpty(_options.Smtp.Username))
        {
            client.Credentials = new NetworkCredential(_options.Smtp.Username, _options.Smtp.Password ?? string.Empty);
        }
        else
        {
            client.UseDefaultCredentials = false;
        }

        try
        {
            await client.SendMailAsync(message, cancellationToken);
            // Intentionally NEVER logs the token, the URL, or the body.
            log.LogInformation(
                "[SmtpEmailSender] sent {Kind} email to {Email} (user {UserId}) via {Host}:{Port}",
                kind, toEmail, userId, _options.Smtp.Host, _options.Smtp.Port);
        }
        catch (Exception ex)
        {
            log.LogWarning(ex,
                "[SmtpEmailSender] failed to send {Kind} email to {Email} via {Host}:{Port} — flow continues",
                kind, toEmail, _options.Smtp.Host, _options.Smtp.Port);
        }
    }
}
