using System.Net;
using System.Net.Http.Json;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Application.DTOs.Auth;
using CodeSparkKids.Infrastructure.Identity;
using CodeSparkKids.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace CodeSparkKids.Api.IntegrationTests.Auth;

public class RegisterParentTests
{
    [Fact]
    public async Task HappyPath_Returns202_CreatesUserProfileRoleAndQueuesEmail()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/v1/auth/parent/register",
            AuthTestHelpers.ValidRegister("p1@example.com"));

        resp.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var body = await resp.Content.ReadFromJsonAsync<GenericMessageResponse>();
        body!.MessageKey.Should().Be("auth.register.checkEmail");

        using var scope = factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user = await users.FindByEmailAsync("p1@example.com");
        user.Should().NotBeNull();
        (await users.IsInRoleAsync(user!, "Parent")).Should().BeTrue();
        db.ParentProfiles.Count(p => p.UserId == user!.Id).Should().Be(1);
        db.AuditEntries.Count(a => a.EventType == "AuthRegister" && a.Result == "success").Should().Be(1);
        factory.Emails.LastVerification("p1@example.com").Should().NotBeNull();
    }

    [Fact]
    public async Task DuplicateEmail_Returns202_ButDoesNotCreateSecondUser()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var first = await client.PostAsJsonAsync("/api/v1/auth/parent/register",
            AuthTestHelpers.ValidRegister("dup@example.com"));
        first.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var second = await client.PostAsJsonAsync("/api/v1/auth/parent/register",
            AuthTestHelpers.ValidRegister("dup@example.com"));
        second.StatusCode.Should().Be(HttpStatusCode.Accepted);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Users.Count(u => u.NormalizedEmail == "DUP@EXAMPLE.COM").Should().Be(1);
        db.AuditEntries.Count(a => a.EventType == "AuthRegister" && a.Result == "ignored").Should().Be(1);
        // Only one verification email
        factory.Emails.Records.Count(r => r.Kind == "verification" && r.ToEmail == "dup@example.com").Should().Be(1);
    }

    [Theory]
    [InlineData("not-an-email", "Sup3rStr0ng!Pass")]
    [InlineData("ok@example.com", "short")]
    [InlineData("ok@example.com", "alllowercaseonly")]
    public async Task InvalidPayload_Returns400(string email, string password)
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/v1/auth/parent/register",
            new RegisterParentRequest(email, password, "Sara", "en", "2026-06-17", null));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UnsupportedLocale_Returns400()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var resp = await client.PostAsJsonAsync("/api/v1/auth/parent/register",
            new RegisterParentRequest("p@example.com", AuthTestHelpers.ValidPassword, "Sara", "fr", "2026-06-17", null));

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
