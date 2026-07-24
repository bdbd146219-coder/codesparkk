using System.Text;
using CodeSparkKids.Application.Common.Auth;
using CodeSparkKids.Application.Common.Interfaces;
using CodeSparkKids.Infrastructure.Audit;
using CodeSparkKids.Infrastructure.Catalog;
using CodeSparkKids.Infrastructure.Common;
using CodeSparkKids.Infrastructure.Email;
using CodeSparkKids.Infrastructure.FileStorage;
using CodeSparkKids.Infrastructure.Identity;
using CodeSparkKids.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CodeSparkKids.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // --- File storage ---------------------------------------------------
        services.Configure<LocalDiskFileStorageOptions>(
            configuration.GetSection(LocalDiskFileStorageOptions.SectionName));
        services.AddSingleton<IFileStorage, LocalDiskFileStorage>();
        // One store over the catalog media root: read-only for the public
        // endpoint, write-only for the authenticated admin upload endpoint,
        // and a maintenance surface used only by the orphan cleanup (C4L).
        services.AddSingleton<LocalDiskCatalogMediaStore>();
        services.AddSingleton<ICatalogMediaStore>(sp =>
            sp.GetRequiredService<LocalDiskCatalogMediaStore>());
        services.AddSingleton<ICatalogMediaWriteStore>(sp =>
            sp.GetRequiredService<LocalDiskCatalogMediaStore>());
        services.AddSingleton<ICatalogMediaMaintenanceStore>(sp =>
            sp.GetRequiredService<LocalDiskCatalogMediaStore>());

        // --- Always-on shared services -------------------------------------
        services.AddSingleton<IClock, SystemClock>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IAuditWriter, AuditWriter>();
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));

        // --- Email sender: switched by Email:Provider --------------------
        // "noop" (default) silently logs; "smtp" routes via SmtpEmailSender
        // to a local catcher (smtp4dev / Papercut) for dev-time testing.
        // Tests further replace this via ConfigureTestServices with a
        // TrackingEmailSender — that mechanism is unaffected by this switch.
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        var emailOptions = configuration.GetSection(EmailOptions.SectionName).Get<EmailOptions>() ?? new EmailOptions();
        if (string.Equals(emailOptions.Provider, "smtp", StringComparison.OrdinalIgnoreCase))
        {
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        }
        else
        {
            services.AddScoped<IEmailSender, NoOpEmailSender>();
        }

        // --- Database + Identity + Auth (only when a connection string is set) ---
        // Auth requires a DbContext. We follow the same gating that A1 used
        // for the DbContext itself so the API still boots in environments
        // without SQL Server (e.g. early-phase diagnostic-only spins).
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString)) return services;

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString,
                sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name)));

        var authOptions = configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>() ?? new AuthOptions();

        services
            .AddIdentityCore<ApplicationUser>(o =>
            {
                o.Password.RequiredLength = 12;
                o.Password.RequiredUniqueChars = 1;
                o.Password.RequireDigit = false;
                o.Password.RequireLowercase = false;
                o.Password.RequireUppercase = false;
                o.Password.RequireNonAlphanumeric = false;

                o.User.RequireUniqueEmail = true;
                o.SignIn.RequireConfirmedEmail = true;

                o.Lockout.MaxFailedAccessAttempts = authOptions.LockoutMaxFailedAttempts;
                o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(authOptions.LockoutDurationMinutes);
                o.Lockout.AllowedForNewUsers = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddSignInManager<SignInManager<ApplicationUser>>()
            .AddDefaultTokenProviders();

        services.AddHttpContextAccessor();

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = authOptions.RequireHttps;
                options.SaveToken = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = authOptions.JwtIssuer,
                    ValidAudience = authOptions.JwtAudience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions.JwtSigningKey)),
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        services.AddAuthorization();

        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICatalogService, CatalogService>();
        services.AddScoped<ICatalogInterestService, CatalogInterestService>();
        services.AddScoped<IAdminCourseService, AdminCourseService>();
        services.AddScoped<IAdminCategoryService, AdminCategoryService>();
        services.AddScoped<IAdminLearningPathService, AdminLearningPathService>();
        // Cross-checks storage files against DB media references (C4L), so it
        // is only meaningful when a database is configured.
        services.AddScoped<ICatalogMediaCleanupService, CatalogMediaCleanupService>();

        return services;
    }
}
