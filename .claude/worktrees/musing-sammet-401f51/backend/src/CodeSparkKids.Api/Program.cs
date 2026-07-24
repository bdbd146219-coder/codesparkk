using System.Threading.RateLimiting;
using CodeSparkKids.Api.Auth;
using CodeSparkKids.Api.Middleware;
using CodeSparkKids.Application;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Infrastructure;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// --- Serilog ---------------------------------------------------------------
builder.Host.UseSerilog((context, services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File(
            path: "logs/codesparkkids-.log",
            rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 14);
});

// --- Services --------------------------------------------------------------
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Course-management authorization policies (Admin/SuperAdmin in V1). Registered
// here in the composition root; configuration accumulates with the
// AddAuthorization() call inside AddInfrastructure.
builder.Services.AddAuthorization(options => options.AddCoursePolicies());

builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<RefreshCookie>();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Code Spark Kids API",
        Version = "v1",
        Description = "Backend API for the Code Spark Kids learning platform.",
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT bearer token issued by /api/v1/auth/login.",
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            },
            Array.Empty<string>()
        },
    });
});

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ValidationExceptionHandler>();
builder.Services.AddExceptionHandler<AuthExceptionHandler>();
builder.Services.AddExceptionHandler<CatalogExceptionHandler>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddHealthChecks();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? ["http://localhost:5173"];
        policy
            .WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
            }));

    // Per-endpoint policies. All partitioned by client IP.
    static Func<HttpContext, RateLimitPartition<string>> FixedWindow(int permit, TimeSpan window) =>
        ctx => RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "anonymous",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = permit,
                Window = window,
            });

    options.AddPolicy("auth-register", FixedWindow(5, TimeSpan.FromHours(1)));
    options.AddPolicy("auth-login", FixedWindow(10, TimeSpan.FromMinutes(15)));
    options.AddPolicy("auth-refresh", FixedWindow(60, TimeSpan.FromHours(1)));
    options.AddPolicy("auth-forgot", FixedWindow(3, TimeSpan.FromHours(1)));
    options.AddPolicy("auth-reset", FixedWindow(5, TimeSpan.FromHours(1)));
    options.AddPolicy("auth-verify", FixedWindow(10, TimeSpan.FromHours(1)));
    options.AddPolicy("auth-resend", FixedWindow(3, TimeSpan.FromHours(1)));
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

// --- Pipeline --------------------------------------------------------------
var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Code Spark Kids API v1");
        options.RoutePrefix = "swagger";
    });
}
else
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

app.UseCors("Frontend");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// --- Endpoints -------------------------------------------------------------
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.MapGet("/api/v1/ping", () => Results.Ok(new { status = "ok", service = "codesparkkids-api" }))
    .WithName("Ping")
    .WithTags("Diagnostics");

app.MapControllers();

// --- Development catalog seeding -------------------------------------------
// Development-only and opt-in via Catalog:SeedOnStartup. Applies pending
// migrations then runs the idempotent catalog seeder. Never runs in any other
// environment, and the integration test host disables it explicitly.
if (app.Environment.IsDevelopment() &&
    app.Configuration.GetValue<bool>("Catalog:SeedOnStartup"))
{
    using var scope = app.Services.CreateScope();
    var sp = scope.ServiceProvider;
    var db = sp.GetService<CodeSparkKids.Infrastructure.Persistence.AppDbContext>();
    if (db is not null)
    {
        try
        {
            await db.Database.MigrateAsync();
            var nowUtc = sp.GetRequiredService<IClock>().UtcNow;
            await CodeSparkKids.Infrastructure.Persistence.Seeding.DevelopmentDataSeeder.SeedAsync(db, nowUtc);
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Development catalog seeding failed.");
        }
    }
}

app.Run();

// Exposed for WebApplicationFactory in integration tests.
public partial class Program;
