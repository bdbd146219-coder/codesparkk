using System.Net;
using CodeSparkKids.Api.IntegrationTests.Support;
using CodeSparkKids.Domain.Auth;
using FluentAssertions;

namespace CodeSparkKids.Api.IntegrationTests.Catalog;

public class AdminCourseAuthorizationTests
{
    private const string ListUrl = "/api/v1/admin/courses";

    [Fact]
    public async Task Anonymous_gets_401()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();

        var resp = await client.GetAsync(ListUrl);

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Parent_gets_403()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        await factory.RegisterAndVerifyAsync(client, "parent@example.com");
        var (_, login) = await client.LoginAsync("parent@example.com");

        var req = new HttpRequestMessage(HttpMethod.Get, ListUrl).WithBearer(login!.AccessToken);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Instructor_gets_403_for_now()
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, "instructor@example.com", AppRoles.Instructor);

        var req = new HttpRequestMessage(HttpMethod.Get, ListUrl).WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Theory]
    [InlineData(AppRoles.Admin)]
    [InlineData(AppRoles.SuperAdmin)]
    public async Task Staff_roles_get_200(string role)
    {
        await using var factory = new AuthTestFactory();
        var client = factory.CreateClient();
        var token = await factory.CreateRoleUserAndLoginAsync(client, $"{role}@example.com", role);

        var req = new HttpRequestMessage(HttpMethod.Get, ListUrl).WithBearer(token);
        var resp = await client.SendAsync(req);

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
