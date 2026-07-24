namespace CodeSparkKids.Domain.Catalog;

/// <summary>
/// Stable string identifiers for catalog-related audit events, mirroring the
/// convention established by <see cref="Auth.AuditEventTypes"/>. Constants (not
/// enums) keep the audit log queryable from raw SQL. No controller or service
/// writes these yet — they are declared here so later API work has a single
/// source of truth.
/// </summary>
public static class CourseAuditEventTypes
{
    public const string CourseCreated = "CourseCreated";
    public const string CourseUpdated = "CourseUpdated";
    public const string CoursePublished = "CoursePublished";
    public const string CourseUnpublished = "CourseUnpublished";
    public const string CourseArchived = "CourseArchived";
    public const string CourseRestored = "CourseRestored";
    public const string CourseDeleted = "CourseDeleted";
    public const string CourseInstructorAssigned = "CourseInstructorAssigned";
    public const string CourseInstructorUnassigned = "CourseInstructorUnassigned";
    public const string CourseModuleAdded = "CourseModuleAdded";
    public const string CourseModuleUpdated = "CourseModuleUpdated";
    public const string CourseModuleReordered = "CourseModuleReordered";
    public const string CourseModuleRemoved = "CourseModuleRemoved";

    public const string CategoryCreated = "CategoryCreated";
    public const string CategoryUpdated = "CategoryUpdated";
    public const string CategoryActivated = "CategoryActivated";
    public const string CategoryDeactivated = "CategoryDeactivated";

    public const string LearningPathCreated = "LearningPathCreated";
    public const string LearningPathUpdated = "LearningPathUpdated";
    public const string LearningPathPublished = "LearningPathPublished";
    public const string LearningPathUnpublished = "LearningPathUnpublished";
    public const string LearningPathArchived = "LearningPathArchived";
    public const string LearningPathRestored = "LearningPathRestored";
    public const string LearningPathItemAdded = "LearningPathItemAdded";
    public const string LearningPathItemRemoved = "LearningPathItemRemoved";
    public const string LearningPathItemReordered = "LearningPathItemReordered";
}
