using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Domain.Catalog;
using FluentValidation;

namespace CodeSparkKids.Application.Features.Catalog.Validators;

internal static class AdminCourseValidationRules
{
    public static bool IsEnum<TEnum>(string? value) where TEnum : struct, Enum =>
        !string.IsNullOrWhiteSpace(value) &&
        Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed) &&
        Enum.IsDefined(parsed);

    public static IRuleBuilderOptions<T, string> MustBeEnum<T, TEnum>(this IRuleBuilder<T, string> rb)
        where TEnum : struct, Enum =>
        rb.NotEmpty().Must(IsEnum<TEnum>)
          .WithMessage($"Must be one of: {string.Join(", ", System.Enum.GetNames(typeof(TEnum)))}.");
}

public sealed class CreateCourseRequestValidator : AbstractValidator<CreateCourseRequest>
{
    public CreateCourseRequestValidator()
    {
        RuleFor(x => x.TitleEn).NotEmpty().MaximumLength(160);
        RuleFor(x => x.TitleAr!).MaximumLength(160).When(x => x.TitleAr is not null);
        RuleFor(x => x.Slug!)
            .MaximumLength(80)
            .Must(Slug.IsValid).WithMessage("Slug must be lowercase alphanumeric with single hyphens.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));
        RuleFor(x => x.PrimaryCategoryId).NotEmpty();
        RuleFor(x => x.DeliveryType).MustBeEnum<CreateCourseRequest, CourseDeliveryType>();
        RuleFor(x => x.Difficulty).MustBeEnum<CreateCourseRequest, CourseDifficulty>();
        RuleFor(x => x.AgeBand).MustBeEnum<CreateCourseRequest, AgeBand>();
        RuleFor(x => x.MinAge).GreaterThanOrEqualTo(0).LessThanOrEqualTo(120);
        RuleFor(x => x.MaxAge).GreaterThanOrEqualTo(0).LessThanOrEqualTo(120);
        RuleFor(x => x).Must(x => x.MinAge <= x.MaxAge)
            .WithMessage("MinAge must be less than or equal to MaxAge.");
    }
}

public sealed class UpdateCourseRequestValidator : AbstractValidator<UpdateCourseRequest>
{
    public UpdateCourseRequestValidator()
    {
        // Required = must be supplied (non-null). An empty string is a legitimate
        // token value on providers without a native rowversion (SQLite in tests);
        // correctness is enforced by the explicit comparison in the service.
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.Slug!)
            .MaximumLength(80)
            .Must(Slug.IsValid).WithMessage("Slug must be lowercase alphanumeric with single hyphens.")
            .When(x => !string.IsNullOrWhiteSpace(x.Slug));

        RuleFor(x => x.TitleEn).NotEmpty().MaximumLength(160);
        RuleFor(x => x.TitleAr!).MaximumLength(160).When(x => x.TitleAr is not null);
        RuleFor(x => x.SubtitleEn!).MaximumLength(200).When(x => x.SubtitleEn is not null);
        RuleFor(x => x.SubtitleAr!).MaximumLength(200).When(x => x.SubtitleAr is not null);
        RuleFor(x => x.SummaryEn!).MaximumLength(500).When(x => x.SummaryEn is not null);
        RuleFor(x => x.SummaryAr!).MaximumLength(500).When(x => x.SummaryAr is not null);
        RuleFor(x => x.DescriptionEn!).MaximumLength(4000).When(x => x.DescriptionEn is not null);
        RuleFor(x => x.DescriptionAr!).MaximumLength(4000).When(x => x.DescriptionAr is not null);

        RuleFor(x => x.DeliveryType).MustBeEnum<UpdateCourseRequest, CourseDeliveryType>();
        RuleFor(x => x.Difficulty).MustBeEnum<UpdateCourseRequest, CourseDifficulty>();
        RuleFor(x => x.AgeBand).MustBeEnum<UpdateCourseRequest, AgeBand>();
        RuleFor(x => x.MinAge).GreaterThanOrEqualTo(0).LessThanOrEqualTo(120);
        RuleFor(x => x.MaxAge).GreaterThanOrEqualTo(0).LessThanOrEqualTo(120);
        RuleFor(x => x).Must(x => x.MinAge <= x.MaxAge)
            .WithMessage("MinAge must be less than or equal to MaxAge.");
        RuleFor(x => x.PrimaryCategoryId).NotEmpty();

        When(x => x.Pricing is not null, () =>
        {
            RuleFor(x => x.Pricing!.Model).MustBeEnum<UpdateCourseRequest, PricingModel>();
            RuleFor(x => x.Pricing!.Currency!).Length(3)
                .When(x => !string.IsNullOrWhiteSpace(x.Pricing!.Currency));
        });

        When(x => x.Media is not null, () =>
        {
            RuleFor(x => x.Media!.ThumbnailKey!).MaximumLength(256).When(x => x.Media!.ThumbnailKey is not null);
            RuleFor(x => x.Media!.ThumbnailAlt!).MaximumLength(256).When(x => x.Media!.ThumbnailAlt is not null);
            RuleFor(x => x.Media!.HeroKey!).MaximumLength(256).When(x => x.Media!.HeroKey is not null);
            RuleFor(x => x.Media!.PromoVideoUrl!).MaximumLength(512).When(x => x.Media!.PromoVideoUrl is not null);
        });

        RuleForEach(x => x.Outcomes).ChildRules(o =>
        {
            o.RuleFor(i => i.TextEn).MaximumLength(300);
            o.RuleFor(i => i.TextAr).MaximumLength(300);
        }).When(x => x.Outcomes is not null);
    }
}

public sealed class AddModuleRequestValidator : AbstractValidator<AddModuleRequest>
{
    public AddModuleRequestValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.TitleEn).NotEmpty().MaximumLength(160);
        RuleFor(x => x.TitleAr!).MaximumLength(160).When(x => x.TitleAr is not null);
        RuleFor(x => x.SummaryEn!).MaximumLength(1000).When(x => x.SummaryEn is not null);
        RuleFor(x => x.SummaryAr!).MaximumLength(1000).When(x => x.SummaryAr is not null);
    }
}

public sealed class UpdateModuleRequestValidator : AbstractValidator<UpdateModuleRequest>
{
    public UpdateModuleRequestValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.TitleEn).NotEmpty().MaximumLength(160);
        RuleFor(x => x.TitleAr!).MaximumLength(160).When(x => x.TitleAr is not null);
        RuleFor(x => x.SummaryEn!).MaximumLength(1000).When(x => x.SummaryEn is not null);
        RuleFor(x => x.SummaryAr!).MaximumLength(1000).When(x => x.SummaryAr is not null);
    }
}

public sealed class ReorderModulesRequestValidator : AbstractValidator<ReorderModulesRequest>
{
    public ReorderModulesRequestValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.OrderedModuleIds).NotNull().NotEmpty().WithMessage("orderedModuleIds is required.");
    }
}

public sealed class AssignInstructorRequestValidator : AbstractValidator<AssignInstructorRequest>
{
    public AssignInstructorRequestValidator()
    {
        RuleFor(x => x.RowVersion).NotNull().WithMessage("rowVersion is required.");
        RuleFor(x => x.InstructorUserId).NotEmpty();
        RuleFor(x => x.RoleOnCourse).MustBeEnum<AssignInstructorRequest, CourseInstructorRole>();
    }
}
