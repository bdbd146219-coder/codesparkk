namespace CodeSparkKids.Domain.Catalog;

/// <summary>
/// How a course is delivered to students. Persisted as <c>int</c> — values are
/// explicit and must never be renumbered once data exists.
/// </summary>
public enum CourseDeliveryType
{
    Recorded = 1,
    Live = 2,
    Hybrid = 3,
}

/// <summary>Relative difficulty of a course.</summary>
public enum CourseDifficulty
{
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3,
}

/// <summary>
/// Age cohort a course or learning path targets. NOTE: "Staff" is deliberately
/// NOT an age band — staff is an internal role/UI concept, never course content.
/// </summary>
public enum AgeBand
{
    Junior = 1,
    Explorer = 2,
}

/// <summary>Editorial lifecycle state of a course or learning path.</summary>
public enum CoursePublishState
{
    Draft = 1,
    InReview = 2,
    Published = 3,
    Archived = 4,
}

/// <summary>Role an instructor plays on a specific course.</summary>
public enum CourseInstructorRole
{
    Lead = 1,
    Assistant = 2,
}

/// <summary>
/// Commercial model for a course. Only <see cref="Free"/> is active in this
/// phase; OneTime and Subscription are modelled for later but carry no payment
/// logic yet.
/// </summary>
public enum PricingModel
{
    Free = 1,
    OneTime = 2,
    Subscription = 3,
}
