namespace CodeSparkKids.Domain.Catalog;

/// <summary>
/// Stable, presentation-agnostic codes for the learning-path publish checklist.
/// <see cref="NoPublishedCourse"/> cannot be evaluated by the aggregate alone
/// (it depends on course publish state) — it is added by the application service.
/// </summary>
public enum LearningPathRequirement
{
    TitleIncomplete,
    NoItems,
    NoPublishedCourse,
}

/// <summary>
/// Result of a learning path's publish-readiness check. The domain reports the
/// requirements it can evaluate (title, item count); the service may add
/// <see cref="LearningPathRequirement.NoPublishedCourse"/>.
/// </summary>
public sealed class LearningPathReadiness
{
    public IReadOnlyList<LearningPathRequirement> Unmet { get; }

    public LearningPathReadiness(IReadOnlyList<LearningPathRequirement> unmet) => Unmet = unmet;

    public bool IsReady => Unmet.Count == 0;
}
