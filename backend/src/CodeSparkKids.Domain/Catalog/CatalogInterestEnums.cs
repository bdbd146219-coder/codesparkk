namespace CodeSparkKids.Domain.Catalog;

/// <summary>Which public catalog item a pre-commerce interest lead is about.</summary>
public enum CatalogInterestSourceType
{
    Course = 0,
    LearningPath = 1,
}

/// <summary>
/// Lifecycle of an interest lead. Deliberately minimal — this is a
/// contact-me funnel, NOT enrollment: there is no "enrolled", "paid", or
/// "access granted" state, by design.
/// </summary>
public enum CatalogInterestStatus
{
    /// <summary>Just submitted; awaiting staff follow-up.</summary>
    New = 0,

    /// <summary>Staff has reached out.</summary>
    Contacted = 1,

    /// <summary>Closed / no longer actionable.</summary>
    Archived = 2,
}
