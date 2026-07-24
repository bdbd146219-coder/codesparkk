# Local auth testing runbook

End-to-end manual test of the Parent auth flow against the local backend, using Swagger UI and a local SMTP catcher. Use this to verify B1B before the B1C frontend lands, and any time the auth contract changes.

> **Automated tests.** This runbook is the *manual* full-journey check. For the automated layers — backend integration tests, frontend Vitest suites (incl. locale parity), and the frontend Playwright auth smoke (`npm run test:e2e`, which needs no backend or SMTP) — see [testing.md](testing.md). The full register→verify→login→logout journey over real SMTP is intentionally still manual; the rationale and follow-up plan are documented there.

## Prerequisites

- .NET 8 SDK (pinned via `global.json`)
- SQL Server LocalDB (ships with most Visual Studio / SQL Server Express installs) **or** SQL Server reachable via a connection string you set
- A local SMTP catcher — pick one:
  - **smtp4dev** (recommended) — `dotnet tool install -g Rnwood.Smtp4dev` then `smtp4dev --smtpport=2525`
  - **Papercut SMTP** — install from https://papercut.email and configure SMTP port 2525

> **Why a catcher?** Verification and password-reset emails are real SMTP messages. The catcher receives them locally, lets you open them in a browser, and prevents real outbound mail. The raw token is in the email body — that's intentional and safe because nothing ever leaves your machine.

## 1. Start the catcher

```sh
# smtp4dev
smtp4dev --smtpport=2525 --imapport=0
# Web UI: http://localhost:5000
```

Confirm the SMTP port matches `Email:Smtp:Port` in [`appsettings.Development.json`](../backend/src/CodeSparkKids.Api/appsettings.Development.json) (default `2525`).

## 2. Apply the database migration

```sh
cd backend
dotnet ef database update --project src/CodeSparkKids.Infrastructure --startup-project src/CodeSparkKids.Api
```

This creates the `CodeSparkKids_Dev` database in LocalDB with the Identity tables plus `ParentProfiles`, `RefreshTokens`, and `AuditEntries`. Re-run any time you change a migration; safe to re-run when nothing has changed.

If LocalDB is unavailable, set a different connection string and re-run:

```sh
$env:ConnectionStrings__DefaultConnection = "Server=YOUR-SERVER;Database=CodeSparkKids_Dev;..."
dotnet ef database update --project src/CodeSparkKids.Infrastructure --startup-project src/CodeSparkKids.Api
```

Verify with:

```sh
dotnet ef migrations list --project src/CodeSparkKids.Infrastructure --startup-project src/CodeSparkKids.Api
# Expect: 20260620223014_InitialIdentityAuth (Applied)
```

## 3. Start the backend

```sh
cd backend
dotnet run --project src/CodeSparkKids.Api
# Listening on http://localhost:5000 (or whatever launchSettings.json picks)
```

Health probes:

```sh
curl -i http://localhost:5000/health/ready          # → 200
curl    http://localhost:5000/api/v1/ping           # → {"status":"ok",...}
```

Open Swagger: <http://localhost:5000/swagger>.

## 4. Register a parent

In Swagger UI, expand **`POST /api/v1/auth/parent/register`** → "Try it out" → request body:

```json
{
  "email": "parent@test.local",
  "password": "Sup3rStr0ng!Pass",
  "displayName": "Sara",
  "preferredLocale": "en",
  "acceptedTermsVersion": "2026-06-17",
  "timeZone": "Europe/London"
}
```

Execute → **expect `202 Accepted`** with `{ "messageKey": "auth.register.checkEmail" }`.

> Re-registering the same email is also 202 — the API never reveals whether the address exists. Only the first attempt creates a user; the rest are audited as `ignored`.

## 5. Open the verification email

Open the catcher UI (smtp4dev: <http://localhost:5000>; Papercut: its own window).

You should see an email titled **"Verify your email — Code Spark Kids"** addressed to `parent@test.local`. The body has a "Verify email" button linking to:

```
http://localhost:5173/auth/verify-email?userId=<guid>&token=<url-encoded-token>
```

Copy the **`userId`** and **`token`** querystring values out of the link.

## 6. Verify the email

In Swagger, expand **`POST /api/v1/auth/verify-email`** → request body:

```json
{
  "userId": "<the userId from the email>",
  "token": "<the URL-DECODED token from the email>"
}
```

Execute → **expect `200 OK`** with `{ "ok": true, "alreadyVerified": false }`.

> URL-decoding the token: when you paste from the URL, decode `%2B` → `+`, `%2F` → `/`, etc. Browsers do this automatically when you navigate, but Swagger needs the raw value in the JSON body. If you're unsure, run the URL through `decodeURIComponent` in any browser devtools console.

## 7. Log in

`POST /api/v1/auth/login`:

```json
{ "email": "parent@test.local", "password": "Sup3rStr0ng!Pass" }
```

**Expect `200 OK`** with body:

```json
{
  "accessToken": "eyJ...",
  "accessTokenExpiresAt": "2026-...Z",
  "user": {
    "id": "...",
    "email": "parent@test.local",
    "displayName": "Sara",
    "roles": ["Parent"],
    "emailVerified": true,
    "preferredLocale": "en",
    "timeZone": "Europe/London"
  }
}
```

The response also sets a `csk_rt` refresh cookie. Swagger UI's "Try it out" cookies are managed by the browser, so it persists for `/refresh` and `/logout` calls below.

## 8. Authorize Swagger

Click the **Authorize** padlock in the top-right of Swagger. Paste the `accessToken` value (the long `eyJ...` string — no `Bearer ` prefix needed; Swagger adds it). Click Authorize → Close.

## 9. Call `/me`

`GET /api/v1/auth/me` → **expect `200 OK`** with the safe user shape.

The response will not contain `passwordHash`, `securityStamp`, `concurrencyStamp`, or `refreshToken` — that's enforced by tests.

## 10. Refresh

`POST /api/v1/auth/refresh` (no body). The browser sends the `csk_rt` cookie automatically.

**Expect `200 OK`** with a new `accessToken` and `accessTokenExpiresAt`. The old refresh token is now revoked and a new one is set in the cookie.

> Replay test: keep the previous response open, click Execute again with **the old cookie** — that would trigger theft detection and the entire chain is revoked. Use this only when you intentionally want to verify the security behaviour; from the catcher you'll see the immediate audit log entry.

## 11. Logout

`POST /api/v1/auth/logout` → **expect `204 No Content`**. The cookie is cleared and the refresh token is revoked server-side. A subsequent `/refresh` returns `401`.

## Status-code reference

| Endpoint | Success | Failure modes |
| --- | --- | --- |
| `POST /auth/parent/register` | 202 | 400 validation · 429 rate limit |
| `POST /auth/login` | 200 | 401 invalid-credentials · 403 email-not-verified · 423 account-locked · 429 |
| `POST /auth/refresh` | 200 | 401 refresh-invalid · 401 refresh-theft · 429 |
| `POST /auth/logout` | 204 | (always 204) |
| `GET /auth/me` | 200 | 401 access-invalid |
| `POST /auth/forgot-password` | 202 | 400 · 429 |
| `POST /auth/reset-password` | 200 | 400 reset-invalid · 429 |
| `POST /auth/verify-email` | 200 | 400 verify-invalid · 429 |
| `POST /auth/resend-verification` | 202 | 400 · 429 |

## Configuration knobs

`Email` section (override in `appsettings.Development.json`, env vars, or user-secrets):

| Key | Default | Notes |
| --- | --- | --- |
| `Email:Provider` | `noop` (root) / `smtp` (Dev) | `noop` logs only; `smtp` routes through `SmtpEmailSender` |
| `Email:FrontendBaseUrl` | `http://localhost:5173` | Used to build the verify / reset links in the email body |
| `Email:FromEmail` | `no-reply@codesparkkids.local` | |
| `Email:FromName` | `Code Spark Kids` | |
| `Email:Smtp:Host` | `localhost` | Catcher host |
| `Email:Smtp:Port` | `2525` | smtp4dev / Papercut default |
| `Email:Smtp:UseSsl` | `false` | Local catcher doesn't need TLS |
| `Email:Smtp:Username` / `Password` | unset | Only set when targeting an auth-protected relay |

**Never commit a real SMTP password.** Use `dotnet user-secrets` in dev or environment variables in CI.

## Safety reminders

- Raw refresh tokens are stored only as SHA-256 hashes in the DB. The cookie value is the only place the raw token exists at rest.
- Raw verification / reset tokens appear ONLY in the email body — never in application logs (the SMTP sender logs `kind / email / userId / host:port` and nothing else).
- The `Email:Provider=smtp` setting only takes effect when a connection string exists (DI is gated). Without one, the API boots but auth is disabled.
- Tests always inject a `TrackingEmailSender` via `WebApplicationFactory.ConfigureTestServices` — no SMTP is touched in CI.
