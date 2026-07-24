using CodeSparkKids.Application.DTOs.Admin;
using CodeSparkKids.Domain.Catalog;

namespace CodeSparkKids.Application.Common.Catalog;

/// <summary>
/// Maps the domain's coded <see cref="LearningPathRequirement"/> list to the API
/// <see cref="LearningPathReadinessDto"/> with stable kebab codes, i18n keys, and
/// English fallback messages. Single source of readiness presentation for paths.
/// </summary>
public static class LearningPathReadinessMapper
{
    public static LearningPathReadinessDto Map(IReadOnlyList<LearningPathRequirement> unmet)
    {
        var items = unmet
            .Select(r => new LearningPathReadinessItemDto(CodeOf(r), MessageKeyOf(r), Satisfied: false, MessageOf(r)))
            .ToList();
        return new LearningPathReadinessDto(unmet.Count == 0, items);
    }

    private static string CodeOf(LearningPathRequirement r) => r switch
    {
        LearningPathRequirement.TitleIncomplete => "title-incomplete",
        LearningPathRequirement.NoItems => "no-items",
        LearningPathRequirement.NoPublishedCourse => "no-published-course",
        _ => "unknown",
    };

    private static string MessageKeyOf(LearningPathRequirement r) => r switch
    {
        LearningPathRequirement.TitleIncomplete => "learningPaths.readiness.titleIncomplete",
        LearningPathRequirement.NoItems => "learningPaths.readiness.noItems",
        LearningPathRequirement.NoPublishedCourse => "learningPaths.readiness.noPublishedCourse",
        _ => "learningPaths.readiness.unknown",
    };

    private static string MessageOf(LearningPathRequirement r) => r switch
    {
        LearningPathRequirement.TitleIncomplete => "Title must be present in English and Arabic.",
        LearningPathRequirement.NoItems => "Add at least one course to this learning path.",
        LearningPathRequirement.NoPublishedCourse => "Add at least one published course to this learning path.",
        _ => "An unknown requirement is unmet.",
    };
}
