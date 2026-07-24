using CodeSparkKids.Domain.Auth;
using Microsoft.AspNetCore.Authorization;

namespace CodeSparkKids.Api.Auth;

/// <summary>
/// Named authorization policies for course management. Defined granularly now
/// so future role refinement (e.g. instructors who may edit but not publish)
/// needs only a membership change, not new endpoints. In V1 every policy maps
/// to Admin + SuperAdmin. Policies use <c>RequireRole</c>, which inspects ALL
/// role claims — never rely on <see cref="Application.Common.Interfaces.ICurrentUser"/>.Role,
/// which only reads the first.
/// </summary>
public static class CoursePolicies
{
    public const string ViewDrafts = "Courses.ViewDrafts";
    public const string Manage = "Courses.Manage";
    public const string Publish = "Courses.Publish";
    public const string Archive = "Courses.Archive";

    public const string CategoriesManage = "Categories.Manage";

    public const string LearningPathsManage = "LearningPaths.Manage";
    public const string LearningPathsPublish = "LearningPaths.Publish";
    public const string LearningPathsArchive = "LearningPaths.Archive";

    public static AuthorizationOptions AddCoursePolicies(this AuthorizationOptions options)
    {
        string[] staff = [AppRoles.Admin, AppRoles.SuperAdmin];

        options.AddPolicy(ViewDrafts, p => p.RequireRole(staff));
        options.AddPolicy(Manage, p => p.RequireRole(staff));
        options.AddPolicy(Publish, p => p.RequireRole(staff));
        options.AddPolicy(Archive, p => p.RequireRole(staff));

        options.AddPolicy(CategoriesManage, p => p.RequireRole(staff));

        options.AddPolicy(LearningPathsManage, p => p.RequireRole(staff));
        options.AddPolicy(LearningPathsPublish, p => p.RequireRole(staff));
        options.AddPolicy(LearningPathsArchive, p => p.RequireRole(staff));

        return options;
    }
}
