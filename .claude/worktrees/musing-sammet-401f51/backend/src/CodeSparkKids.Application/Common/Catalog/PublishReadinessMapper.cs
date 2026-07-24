using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Domain.Catalog;

namespace CodeSparkKids.Application.Common.Catalog;

/// <summary>
/// Maps the domain's coded <see cref="PublishReadiness"/> to the API
/// <see cref="PublishReadinessDto"/>, attaching a stable kebab-case code, an
/// i18n message key, and an English fallback message per requirement. This is
/// the single source of truth for readiness presentation.
/// </summary>
public static class PublishReadinessMapper
{
    public static PublishReadinessDto Map(PublishReadiness readiness)
    {
        var items = readiness.Unmet
            .Select(r => new PublishReadinessItemDto(CodeOf(r), MessageKeyOf(r), Satisfied: false, MessageOf(r)))
            .ToList();
        return new PublishReadinessDto(readiness.IsReady, items);
    }

    private static string CodeOf(PublishRequirement r) => r switch
    {
        PublishRequirement.TitleIncomplete => "title-incomplete",
        PublishRequirement.SummaryIncomplete => "summary-incomplete",
        PublishRequirement.DescriptionMissing => "description-missing",
        PublishRequirement.PrimaryCategoryMissing => "primary-category-missing",
        PublishRequirement.AgeRangeInvalid => "age-range-invalid",
        PublishRequirement.SlugInvalid => "slug-invalid",
        PublishRequirement.ThumbnailMissing => "thumbnail-missing",
        PublishRequirement.LeadInstructorMissing => "lead-instructor-missing",
        PublishRequirement.ModulesRequired => "modules-required",
        _ => "unknown",
    };

    private static string MessageKeyOf(PublishRequirement r) => r switch
    {
        PublishRequirement.TitleIncomplete => "courses.readiness.titleIncomplete",
        PublishRequirement.SummaryIncomplete => "courses.readiness.summaryIncomplete",
        PublishRequirement.DescriptionMissing => "courses.readiness.descriptionMissing",
        PublishRequirement.PrimaryCategoryMissing => "courses.readiness.primaryCategoryMissing",
        PublishRequirement.AgeRangeInvalid => "courses.readiness.ageRangeInvalid",
        PublishRequirement.SlugInvalid => "courses.readiness.slugInvalid",
        PublishRequirement.ThumbnailMissing => "courses.readiness.thumbnailMissing",
        PublishRequirement.LeadInstructorMissing => "courses.readiness.leadInstructorMissing",
        PublishRequirement.ModulesRequired => "courses.readiness.modulesRequired",
        _ => "courses.readiness.unknown",
    };

    private static string MessageOf(PublishRequirement r) => r switch
    {
        PublishRequirement.TitleIncomplete => "Title must be present in English and Arabic.",
        PublishRequirement.SummaryIncomplete => "Summary must be present in English and Arabic.",
        PublishRequirement.DescriptionMissing => "A description is required.",
        PublishRequirement.PrimaryCategoryMissing => "A primary category is required.",
        PublishRequirement.AgeRangeInvalid => "MinAge must be less than or equal to MaxAge.",
        PublishRequirement.SlugInvalid => "The slug is invalid.",
        PublishRequirement.ThumbnailMissing => "A thumbnail is required.",
        PublishRequirement.LeadInstructorMissing => "At least one lead instructor is required.",
        PublishRequirement.ModulesRequired => "Recorded and hybrid courses require at least one module.",
        _ => "An unknown requirement is unmet.",
    };
}
