using CodeSparkKids.Application.Common.Auth;
using CodeSparkKids.Application.DTOs.Auth;
using FluentValidation;
using Microsoft.Extensions.Options;

namespace CodeSparkKids.Application.Features.Auth.Validators;

internal static class AuthValidationRules
{
    public static readonly string[] SupportedLocales = ["en", "ar"];

    public static IRuleBuilderOptions<T, string> Email<T>(this IRuleBuilder<T, string> rb) =>
        rb.NotEmpty()
          .EmailAddress()
          .MaximumLength(254);

    public static IRuleBuilderOptions<T, string> Password<T>(this IRuleBuilder<T, string> rb) =>
        rb.NotEmpty()
          .MinimumLength(12).WithMessage("Password must be at least 12 characters.")
          .MaximumLength(128)
          .Must(PassesComplexity)
          .WithMessage("Password must mix at least three of: lower, upper, digit, special.");

    public static IRuleBuilderOptions<T, string> DisplayName<T>(this IRuleBuilder<T, string> rb) =>
        rb.NotEmpty()
          .MinimumLength(1)
          .MaximumLength(80)
          .Must(s => !s.Any(char.IsControl))
          .WithMessage("Display name must not contain control characters.");

    public static IRuleBuilderOptions<T, string> Locale<T>(this IRuleBuilder<T, string> rb) =>
        rb.NotEmpty()
          .Must(l => SupportedLocales.Contains(l))
          .WithMessage($"Locale must be one of: {string.Join(", ", SupportedLocales)}.");

    private static bool PassesComplexity(string password)
    {
        int classes = 0;
        if (password.Any(char.IsLower)) classes++;
        if (password.Any(char.IsUpper)) classes++;
        if (password.Any(char.IsDigit)) classes++;
        if (password.Any(c => !char.IsLetterOrDigit(c))) classes++;
        return classes >= 3;
    }
}

public sealed class RegisterParentRequestValidator : AbstractValidator<RegisterParentRequest>
{
    public RegisterParentRequestValidator(IOptions<AuthOptions> options)
    {
        var current = options.Value.CurrentTermsVersion;

        RuleFor(x => x.Email).Email();
        RuleFor(x => x.Password).Password();
        RuleFor(x => x.DisplayName).DisplayName();
        RuleFor(x => x.PreferredLocale).Locale();
        RuleFor(x => x.AcceptedTermsVersion)
            .NotEmpty()
            .Equal(current)
            .WithMessage("Accepted terms version does not match the current version.");
        RuleFor(x => x.TimeZone!)
            .MaximumLength(40)
            .When(x => !string.IsNullOrEmpty(x.TimeZone));
    }
}

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(128);
    }
}

public sealed class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email).Email();
    }
}

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Token).NotEmpty().MaximumLength(2048);
        RuleFor(x => x.NewPassword).Password();
    }
}

public sealed class VerifyEmailRequestValidator : AbstractValidator<VerifyEmailRequest>
{
    public VerifyEmailRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
        RuleFor(x => x.Token).NotEmpty().MaximumLength(2048);
    }
}

public sealed class ResendVerificationRequestValidator : AbstractValidator<ResendVerificationRequest>
{
    public ResendVerificationRequestValidator()
    {
        RuleFor(x => x.Email).Email();
    }
}
