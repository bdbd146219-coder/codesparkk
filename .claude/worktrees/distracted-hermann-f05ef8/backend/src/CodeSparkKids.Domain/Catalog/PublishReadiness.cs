namespace CodeSparkKids.Domain.Catalog;

/// <summary>
/// Stable, presentation-agnostic codes for the publish checklist. The domain
/// reports unmet requirements as these codes; the API maps them to localized
/// message keys. Order roughly follows the editor flow.
/// </summary>
public enum PublishRequirement
{
    TitleIncomplete,
    SummaryIncomplete,
    DescriptionMissing,
    PrimaryCategoryMissing,
    AgeRangeInvalid,
    SlugInvalid,
    ThumbnailMissing,
    LeadInstructorMissing,
    ModulesRequired,
}

/// <summary>
/// Result of a course's publish-readiness check. Carries the list of unmet
/// requirement codes (empty when ready). Returned by
/// <see cref="Entities.Course.CheckPublishReadiness"/> so callers can show the
/// full checklist before attempting to publish.
/// </summary>
public sealed class PublishReadiness
{
    public IReadOnlyList<PublishRequirement> Unmet { get; }

    public PublishReadiness(IReadOnlyList<PublishRequirement> unmet) => Unmet = unmet;

    public bool IsReady => Unmet.Count == 0;
}
