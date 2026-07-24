namespace CodeSparkKids.Application.Common.Auth;

/// <summary>
/// Stable <c>type</c> URIs for ProblemDetails responses. Frontend looks these
/// up to render localised error copy — never put user-facing English here.
/// </summary>
public static class ProblemTypes
{
    private const string Root = "https://codesparkkids.dev/errors/";

    public const string Validation = Root + "validation";
    public const string InvalidCredentials = Root + "auth/invalid-credentials";
    public const string EmailNotVerified = Root + "auth/email-not-verified";
    public const string AccountLocked = Root + "auth/account-locked";
    public const string RefreshInvalid = Root + "auth/refresh-invalid";
    public const string RefreshTheft = Root + "auth/refresh-theft";
    public const string ResetInvalid = Root + "auth/reset-invalid";
    public const string VerifyInvalid = Root + "auth/verify-invalid";
    public const string AccessInvalid = Root + "auth/access-invalid";

    // --- Catalog (C1B) -----------------------------------------------------
    // Declared now so later catalog API work has a stable contract. Not yet
    // wired to any controller — there are no catalog endpoints in this phase.
    public const string CourseNotFound = Root + "catalog/course-not-found";
    public const string CourseSlugAlreadyExists = Root + "catalog/course-slug-already-exists";
    public const string CoursePublishChecklistFailed = Root + "catalog/course-publish-checklist-failed";
    public const string CourseConcurrencyConflict = Root + "catalog/course-concurrency-conflict";
    public const string CourseInvalidState = Root + "catalog/course-invalid-state";
    public const string LearningPathNotFound = Root + "catalog/learning-path-not-found";
    public const string InvalidCatalogFilter = Root + "catalog/invalid-filter";
    public const string InvalidPagination = Root + "catalog/invalid-pagination";
    public const string CategoryNotFound = Root + "catalog/category-not-found";
    public const string InvalidCourseUpdate = Root + "catalog/invalid-course-update";
    public const string ModuleNotFound = Root + "catalog/module-not-found";
    public const string InstructorNotFound = Root + "catalog/instructor-not-found";
    public const string InvalidInstructorAssignment = Root + "catalog/invalid-instructor-assignment";
    public const string CategorySlugAlreadyExists = Root + "catalog/category-slug-already-exists";
    public const string CategoryConcurrencyConflict = Root + "catalog/category-concurrency-conflict";
    public const string InvalidCategoryUpdate = Root + "catalog/invalid-category-update";
    public const string LearningPathSlugAlreadyExists = Root + "catalog/learning-path-slug-already-exists";
    public const string LearningPathConcurrencyConflict = Root + "catalog/learning-path-concurrency-conflict";
    public const string LearningPathInvalidState = Root + "catalog/learning-path-invalid-state";
    public const string InvalidLearningPathUpdate = Root + "catalog/invalid-learning-path-update";
    public const string LearningPathPublishChecklistFailed = Root + "catalog/learning-path-publish-checklist-failed";
    public const string LearningPathItemNotFound = Root + "catalog/learning-path-item-not-found";
    public const string LearningPathItemDuplicate = Root + "catalog/learning-path-item-duplicate";

    // --- Catalog interest / lead capture (C4N) -----------------------------
    public const string InvalidCatalogInterest = Root + "catalog/invalid-interest";
    public const string CatalogInterestSourceNotFound = Root + "catalog/interest-source-not-found";
    public const string CatalogInterestNotFound = Root + "catalog/interest-not-found";
}
