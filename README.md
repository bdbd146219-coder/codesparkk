# Code Spark Kids

A premium educational coding platform for children ages 6–16. Recorded courses, live sessions, coding practice, projects, gamification — built as one age-aware platform serving Junior (6–9) and Explorer (10–16) bands.

This repository is the V1 skeleton produced in **Task A1**. No business features yet — only the foundation every later task builds on.

## Stack

- **Backend:** ASP.NET Core 8 (Clean Architecture), Entity Framework Core, SQL Server, ASP.NET Identity (later), JWT + refresh tokens (later), Serilog, Swagger.
- **Frontend:** React + Vite + TypeScript (strict), Tailwind CSS, shadcn/ui foundation, React Router, i18next (English + Arabic with full RTL), ESLint, Prettier.
- **Hosting target:** Local-first / VPS-ready. No cloud-vendor SDK dependencies in V1.

See [docs/architecture.md](docs/architecture.md) for the full picture.

## Repository layout

```
codesparkk/
├── backend/
│   ├── src/
│   │   ├── CodeSparkKids.Domain/
│   │   ├── CodeSparkKids.Application/
│   │   ├── CodeSparkKids.Infrastructure/
│   │   └── CodeSparkKids.Api/
│   ├── tests/
│   │   ├── CodeSparkKids.Domain.Tests/
│   │   ├── CodeSparkKids.Application.Tests/
│   │   └── CodeSparkKids.Api.IntegrationTests/
│   └── CodeSparkKids.sln
├── frontend/
│   └── (Vite + React + TS)
├── docs/
└── .github/workflows/ci.yml
```

## Prerequisites

- .NET SDK 8.0.x (the repo pins this via `global.json`)
- Node.js 20.x or newer
- SQL Server or LocalDB (only needed once Phase B starts; not required for A1)

## Getting started

### Backend

```sh
cd backend
dotnet restore
dotnet build
dotnet run --project src/CodeSparkKids.Api
```

The API serves Swagger UI at `https://localhost:<port>/swagger` and a health check at `/health/ready`.

### Frontend

```sh
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`. The skeleton renders a minimal app shell with a working language switcher (English ↔ Arabic, including RTL flip).

## Common scripts

### Frontend (`frontend/`)

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier (write mode) |
| `npm run format:check` | Run Prettier in check-only mode |

### Backend (`backend/`)

| Command | Purpose |
| --- | --- |
| `dotnet build` | Build the solution |
| `dotnet test` | Run all tests |
| `dotnet format` | Apply formatting per `.editorconfig` |
| `dotnet run --project src/CodeSparkKids.Api` | Run the API locally |

## Documentation

- [docs/architecture.md](docs/architecture.md) — high-level architecture and locked decisions
- [docs/backend-architecture.md](docs/backend-architecture.md) — clean-architecture layout, patterns
- [docs/frontend-architecture.md](docs/frontend-architecture.md) — feature-sliced React + i18n/RTL
- [docs/roadmap.md](docs/roadmap.md) — the phased small-task roadmap
- [docs/coding-standards.md](docs/coding-standards.md) — formatting, naming, commit, review rules

## License

Proprietary. All rights reserved.
