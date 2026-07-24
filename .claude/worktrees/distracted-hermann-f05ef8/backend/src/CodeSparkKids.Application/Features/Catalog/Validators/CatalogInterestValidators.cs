using System.Text.RegularExpressions;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Catalog;
using FluentValidation;

namespace CodeSparkKids.Application.Features.Catalog.Validators;

/// <summary>
/// Validation for a public catalog interest submission. Deliberately strict on
/// shape/length (defence against junk + oversized payloads) but lenient enough
/// not to block legitimate parents: email is optional, child age spans a
/// generous band around the 6–16 audience, and phone accepts common formatting.
/// </summary>
public sealed class CreateCatalogInterestRequestValidator : AbstractValidator<CreateCatalogInterestRequest>
{
    // digits plus the usual formatting characters; must contain enough digits.
    private static readonly Regex PhoneShape = new(@"^[0-9+()\-.\s]{6,30}$", RegexOptions.Compiled);
    private static readonly Regex SlugShape = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

    public CreateCatalogInterestRequestValidator()
    {
        RuleFor(x => x.SourceType)
            .NotEmpty()
            .Must(BeKnownSourceType)
            .WithMessage("sourceType must be 'course' or 'learningPath'.");

        RuleFor(x => x.SourceSlug)
            .NotEmpty()
            .MaximumLength(80)
            .Must(s => !string.IsNullOrWhiteSpace(s) && SlugShape.IsMatch(s.Trim().ToLowerInvariant()))
            .WithMessage("sourceSlug must be a valid catalog slug.");

        RuleFor(x => x.ParentName)
            .NotEmpty()
            .MinimumLength(2)
            .MaximumLength(120);

        RuleFor(x => x.Phone)
            .NotEmpty()
            .MaximumLength(30)
            .Must(p => p is not null && PhoneShape.IsMatch(p.Trim()) && p.Count(char.IsDigit) >= 6)
            .WithMessage("phone must be a valid phone number.");

        RuleFor(x => x.Email!)
            .MaximumLength(254)
            .EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.Email));

        RuleFor(x => x.ChildAge!.Value)
            .InclusiveBetween(3, 18)
            .When(x => x.ChildAge is not null)
            .WithMessage("childAge must be between 3 and 18.");

        RuleFor(x => x.PreferredLanguage!)
            .Must(l => l is "en" or "ar")
            .When(x => !string.IsNullOrWhiteSpace(x.PreferredLanguage))
            .WithMessage("preferredLanguage must be 'en' or 'ar'.");

        RuleFor(x => x.Notes!)
            .MaximumLength(1000)
            .When(x => x.Notes is not null);
    }

    public static bool BeKnownSourceType(string? value) =>
        TryParseSourceType(value, out _);

    /// <summary>Case-insensitive parse of the wire value ("course" /
    /// "learningPath" / "learning-path") to the domain enum.</summary>
    public static bool TryParseSourceType(string? value, out CatalogInterestSourceType parsed)
    {
        parsed = default;
        if (string.IsNullOrWhiteSpace(value)) return false;
        switch (value.Trim().Replace("-", "").ToLowerInvariant())
        {
            case "course":
                parsed = CatalogInterestSourceType.Course;
                return true;
            case "learningpath":
                parsed = CatalogInterestSourceType.LearningPath;
                return true;
            default:
                return false;
        }
    }
}
