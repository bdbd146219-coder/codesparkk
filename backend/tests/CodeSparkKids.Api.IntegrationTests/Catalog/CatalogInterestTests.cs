using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Catalog;
using CodeSparkKids.Domain.Auth;
using CodeSparkKids.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

/// <summary>
/// C4N — public pre-commerce interest / lead capture. Verifies the public
/// submit path (valid course/path, unlisted-published allowed, draft/unknown
/// rejected, input validation, minimal response), the admin review workflow
/// (list/status, authz), and that a lead grants no access / creates nothing but
/// a lead row.
/// </summary>
public class CatalogInterestTests
{
    private static async Task<(AuthTestFactory Factory, HttpClient Client)> SetupAsync()
    {
        var factory = new AuthTestFactory();
        await CatalogTestData.SeedAsync(factory);
        return (factory, factory.CreateClient());
    }

    private static object ValidBody(string sourceType, string slug, object? overrides = null)
    {
        var b = new Dictionary<string, object?>
        {
            ["sourceType"] = sourceType,
            ["sourceSlug"] = slug,
            ["parentName"] = "Ali Ahmed",
            ["phone"] = "+20 100 000 0000",
            ["email"] = "parent@example.com",
            ["childAge"] = 10,
            ["preferredLanguage"] = "ar",
            ["notes"] = "Interested in weekend groups",
        };
        if (overrides is not null)
            foreach (var kv in overrides.GetType().GetProperties())
                b[kv.Name] = kv.GetValue(overrides);
        return b;
    }

    private static Task<HttpResponseMessage> SubmitAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/api/v1/catalog/interest", body);

    // --- Public submit ------------------------------------------------------

    [Fact]
    public async Task Public_can_submit_course_interest_and_response_is_minimal()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;

        var resp = await SubmitAsync(client, ValidBody("course", "python-first-steps"));

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = (await resp.Content.ReadFromJsonAsync<CatalogInterestResponse>())!;
        body.Id.Should().NotBeEmpty();
        body.Status.Should().Be("new");
        body.CreatedAtUtc.Should().BeAfter(default);

        // The public response must NOT echo any submitted contact data.
        var raw = await resp.Content.ReadAsStringAsync();
        raw.Should().NotContainAny("Ali Ahmed", "parent@example.com", "0000", "weekend");

        // Exactly one lead row was created — no enrollment/subscription/access.
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.CatalogInterestLeads.CountAsync()).Should().Be(1);
        var lead = await db.CatalogInterestLeads.SingleAsync();
        lead.Status.ToString().Should().Be("New");
        lead.SourceTitleSnapshot.Should().Be("Python First Steps");
    }

    [Fact]
    public async Task Public_can_submit_learning_path_interest()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;

        var resp = await SubmitAsync(client, ValidBody("learningPath", "junior-journey"));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Published_but_unlisted_course_still_accepts_interest()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;

        // hidden-unlisted is Published + unlisted — reachable by direct slug, so
        // its detail page (and thus its interest CTA) is public.
        var resp = await SubmitAsync(client, ValidBody("course", "hidden-unlisted"));
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Draft_or_unknown_source_returns_404()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;

        var draft = await SubmitAsync(client, ValidBody("course", "draft-course"));
        draft.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await draft.Content.ReadAsStringAsync()).Should().Contain("interest-source-not-found");

        var unknown = await SubmitAsync(client, ValidBody("course", "does-not-exist"));
        unknown.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // No lead was stored for either rejected submission.
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.CatalogInterestLeads.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Invalid_inputs_return_400()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;

        (await SubmitAsync(client, ValidBody("nonsense", "python-first-steps")))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await SubmitAsync(client, ValidBody("course", "python-first-steps", new { phone = "abc" })))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await SubmitAsync(client, ValidBody("course", "python-first-steps", new { email = "not-an-email" })))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await SubmitAsync(client, ValidBody("course", "python-first-steps", new { childAge = 40 })))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await SubmitAsync(client, ValidBody("course", "python-first-steps", new { parentName = "" })))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Email_and_optional_fields_may_be_omitted()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;

        var body = new Dictionary<string, object?>
        {
            ["sourceType"] = "course",
            ["sourceSlug"] = "python-first-steps",
            ["parentName"] = "Sara",
            ["phone"] = "0100000000",
        };
        var resp = await SubmitAsync(client, body);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    // --- Admin review -------------------------------------------------------

    [Fact]
    public async Task Admin_can_list_and_update_status()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;
        await SubmitAsync(client, ValidBody("course", "python-first-steps"));

        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);

        var listReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/catalog/interests?pageSize=50").WithBearer(token);
        var listResp = await client.SendAsync(listReq);
        listResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var page = (await listResp.Content.ReadFromJsonAsync<PagedResult<AdminCatalogInterestLeadDto>>())!;
        page.Items.Should().ContainSingle();
        var lead = page.Items[0];
        lead.ParentName.Should().Be("Ali Ahmed"); // admin sees full contact data
        lead.SourceSlug.Should().Be("python-first-steps");
        lead.Status.Should().Be("new");

        var patch = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/admin/catalog/interests/{lead.Id}/status")
        { Content = JsonContent.Create(new { status = "contacted", adminNotes = "Called, left voicemail" }) }.WithBearer(token);
        var patchResp = await client.SendAsync(patch);
        patchResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = (await patchResp.Content.ReadFromJsonAsync<AdminCatalogInterestLeadDto>())!;
        updated.Status.Should().Be("contacted");
        updated.ContactedAtUtc.Should().NotBeNull();
        updated.AdminNotes.Should().Be("Called, left voicemail");

        // Status filter works.
        var filtered = await client.SendAsync(
            new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/catalog/interests?status=new").WithBearer(token));
        var filteredPage = (await filtered.Content.ReadFromJsonAsync<PagedResult<AdminCatalogInterestLeadDto>>())!;
        filteredPage.Items.Should().BeEmpty("the only lead is now contacted, not new");
    }

    [Fact]
    public async Task Admin_invalid_status_returns_400()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;
        await SubmitAsync(client, ValidBody("course", "python-first-steps"));
        var token = await factory.CreateRoleUserAndLoginAsync(client, "admin@example.com", AppRoles.Admin);

        var listResp = await client.SendAsync(
            new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/catalog/interests").WithBearer(token));
        var page = (await listResp.Content.ReadFromJsonAsync<PagedResult<AdminCatalogInterestLeadDto>>())!;
        var id = page.Items[0].Id;

        var patch = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/admin/catalog/interests/{id}/status")
        { Content = JsonContent.Create(new { status = "enrolled" }) }.WithBearer(token);
        (await client.SendAsync(patch)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Admin_endpoints_reject_anonymous_and_non_staff()
    {
        var (factory, client) = await SetupAsync();
        await using var _ = factory;

        var anon = await client.GetAsync("/api/v1/admin/catalog/interests");
        anon.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        await factory.RegisterAndVerifyAsync(client, "parent@example.com");
        var (_, login) = await client.LoginAsync("parent@example.com");
        var parentReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/admin/catalog/interests").WithBearer(login!.AccessToken);
        (await client.SendAsync(parentReq)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
