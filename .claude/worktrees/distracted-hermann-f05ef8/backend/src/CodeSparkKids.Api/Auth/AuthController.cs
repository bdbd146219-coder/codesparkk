using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Application.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CodeSparkKids.Api.Auth;

[ApiController]
[Route("api/v1/auth")]
[Tags("Auth")]
public sealed class AuthController(IAuthService auth, RefreshCookie cookies, ICurrentUser currentUser)
    : ControllerBase
{
    [HttpPost("parent/register")]
    [EnableRateLimiting("auth-register")]
    [ProducesResponseType(typeof(GenericMessageResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterParentRequest request, CancellationToken ct)
    {
        await auth.RegisterParentAsync(request, Context(), ct);
        return Accepted(new GenericMessageResponse("auth.register.checkEmail"));
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth-login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status423Locked)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await auth.LoginAsync(request, Context(), ct);
        cookies.Set(Response, result.RawRefreshToken, result.RefreshExpiresAt);
        return Ok(new LoginResponse(result.AccessToken, result.AccessTokenExpiresAt, result.User));
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("auth-refresh")]
    [ProducesResponseType(typeof(RefreshResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var raw = cookies.Read(Request);
        var result = await auth.RefreshAsync(raw, Context(), ct);
        cookies.Set(Response, result.RawRefreshToken, result.RefreshExpiresAt);
        return Ok(new RefreshResponse(result.AccessToken, result.AccessTokenExpiresAt));
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var raw = cookies.Read(Request);
        await auth.LogoutAsync(raw, Context(), ct);
        cookies.Clear(Response);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(AuthenticatedUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (!Guid.TryParse(currentUser.UserId, out var userId))
        {
            return Unauthorized();
        }
        var dto = await auth.GetCurrentUserAsync(userId, ct);
        if (dto is null) return Unauthorized();
        return Ok(dto);
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth-forgot")]
    [ProducesResponseType(typeof(GenericMessageResponse), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await auth.ForgotPasswordAsync(request, Context(), ct);
        return Accepted(new GenericMessageResponse("auth.forgotPassword.checkEmail"));
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("auth-reset")]
    [ProducesResponseType(typeof(OkResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var ok = await auth.ResetPasswordAsync(request, Context(), ct);
        if (!ok)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                type: Application.Common.Auth.ProblemTypes.ResetInvalid,
                title: "auth.errors.resetInvalid",
                instance: Request.Path);
        }
        return Ok(new OkResponse());
    }

    [HttpPost("verify-email")]
    [EnableRateLimiting("auth-verify")]
    [ProducesResponseType(typeof(VerifyEmailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken ct)
    {
        var outcome = await auth.VerifyEmailAsync(request, Context(), ct);
        return outcome switch
        {
            VerifyEmailOutcome.Verified => Ok(new VerifyEmailResponse(true, false)),
            VerifyEmailOutcome.AlreadyVerified => Ok(new VerifyEmailResponse(true, true)),
            _ => Problem(
                statusCode: StatusCodes.Status400BadRequest,
                type: Application.Common.Auth.ProblemTypes.VerifyInvalid,
                title: "auth.errors.verifyInvalid",
                instance: Request.Path),
        };
    }

    [HttpPost("resend-verification")]
    [EnableRateLimiting("auth-resend")]
    [ProducesResponseType(typeof(GenericMessageResponse), StatusCodes.Status202Accepted)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request, CancellationToken ct)
    {
        await auth.ResendVerificationAsync(request, Context(), ct);
        return Accepted(new GenericMessageResponse("auth.resendVerification.sent"));
    }

    private RequestContext Context() => new(
        HttpContext.Connection.RemoteIpAddress?.ToString(),
        Request.Headers.UserAgent.ToString());
}
