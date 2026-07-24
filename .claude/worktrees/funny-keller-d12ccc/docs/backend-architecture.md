# Backend Architecture

ASP.NET Core 8 with Clean Architecture. Four projects in `backend/src/`, three test projects in `backend/tests/`. The .NET SDK is pinned to **8.0.x** via `global.json` at the repo root.

## Layers

| Project | Depends on | Allowed to reference |
| --- | --- | --- |
| `CodeSparkKids.Domain` | (nothing) | Pure C# only. No EF, no ASP.NET, no MediatR. |
| `CodeSparkKids.Application` | Domain | MediatR, FluentValidation, `Microsoft.Extensions.*` abstractions. **No EF Core**, no concrete infrastructure. |
| `CodeSparkKids.Infrastructure` | Application, Domain | EF Core SqlServer, Serilog sinks, file storage, email, payments. Concrete implementations of Application interfaces. |
| `CodeSparkKids.Api` | Application, Infrastructure | ASP.NET Core, Swagger, middleware. DI composition root. |

**Rule:** dependencies point inward only. If Application needs to talk to the database or filesystem, it does so through an interface defined in Application and implemented in Infrastructure.

## Conventions

### CQRS via MediatR

Each use case is a `Request` + `Handler` pair under `Application/Features/<Area>/`:

```
Application/
└── Features/
    └── Courses/
        ├── GetCourseById/
        │   ├── GetCourseByIdQuery.cs
        │   ├── GetCourseByIdQueryHandler.cs
        │   └── GetCourseByIdQueryValidator.cs   (FluentValidation)
        └── CreateCourse/
            ├── CreateCourseCommand.cs
            ├── CreateCourseCommandHandler.cs
            └── CreateCourseCommandValidator.cs
```

Validators are auto-registered (`AddValidatorsFromAssembly` in `Application.DependencyInjection`). MediatR handlers are auto-registered (`RegisterServicesFromAssembly`).

### Infrastructure interfaces (already in A1)

- `IFileStorage` — file persistence. V1 concrete: `LocalDiskFileStorage`. Future: S3/Azure Blob — same interface, no Application changes.
- `ICurrentUser` — resolves the current principal (id, role, authentication state).
- `IPaymentGateway` — payment processor abstraction (Phase F).

### Errors

- All exceptions are caught by `GlobalExceptionHandler` (registered via `AddExceptionHandler`) and returned as `ProblemDetails`.
- Type URIs follow `https://codesparkkids.dev/errors/<slug>`.
- Validation failures return 400 with field-level details (added in Phase B alongside Identity).

### Logging

Serilog, configured in `Program.cs`:

- Console sink (always)
- Rolling-file sink at `logs/codesparkkids-{Date}.log`, retained 14 days
- Request logging via `UseSerilogRequestLogging()`
- PII redaction policies added in Phase B

### Security defaults (already in A1)

- ProblemDetails for all errors
- CORS locked to configured origins (`Cors:AllowedOrigins`)
- Rate limiting middleware: 120 requests / minute / IP, returns 429
- Forwarded headers honored (important for VPS reverse-proxy deployments)
- HSTS + HTTPS redirect in non-development environments

### Database

- `AppDbContext` lives in `Infrastructure/Persistence`.
- DI registers it **only if** `ConnectionStrings:DefaultConnection` is set, so A1 builds and runs without SQL Server.
- Migrations: added once Phase B starts (Identity tables + parent/child entities).

## Testing

- `Domain.Tests` — fast unit tests over pure logic.
- `Application.Tests` — handler tests, validator tests, DI registration smoke tests.
- `Api.IntegrationTests` — `WebApplicationFactory<Program>` based; hits the real pipeline.

`Program.cs` declares `public partial class Program;` at the bottom so integration tests can reference it.

## Running locally

```sh
cd backend
dotnet restore
dotnet build
dotnet run --project src/CodeSparkKids.Api
```

Then visit:
- `https://localhost:<port>/swagger` — API docs
- `https://localhost:<port>/health/ready` — health check
- `https://localhost:<port>/api/v1/ping` — sanity endpoint

## Manual auth testing

The end-to-end Parent auth flow can be exercised locally against a real DB + a local SMTP catcher. See [auth-local-testing.md](auth-local-testing.md) for the step-by-step runbook.
