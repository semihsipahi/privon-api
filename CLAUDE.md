# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm run start:dev      # Run with file watching
pnpm run start:debug    # Run with debugger + watch
pnpm run start:prod     # Run production build

# Build & Lint
pnpm run build          # Compile TypeScript via nest build
pnpm run lint           # ESLint with auto-fix
pnpm run format         # Prettier format all TS files

# Tests
pnpm run test           # Unit tests
pnpm run test:watch     # Unit tests in watch mode
pnpm run test:cov       # Coverage report
pnpm run test:e2e       # End-to-end tests (jest --config ./test/jest-e2e.json)
```

Swagger UI is available at `http://localhost:8080/api` when running locally.

## Architecture

This is a **NestJS 10 API** using **Fastify** (not Express) as the HTTP adapter, **MongoDB via Mongoose**, and **JWT authentication**. It's a multi-tenant restaurant reservation platform.

### Key Architectural Decisions

- **Fastify adapter** — use `@fastify/multipart` for file upload, not multer. File size limit is 50MB.
- **Global providers** — `JwtAuthGuard`, `RolesGuard`, `ThrottlerGuard`, `AllExceptionsFilter`, and `LoggingInterceptor` are registered globally in `app.module.ts`. All routes are protected by JWT by default.
- **`@Public()` decorator** — use this on any controller method that should bypass JWT.
- **`@Roles()` decorator** — use alongside `@Public()` absence to specify which roles can access an endpoint.
- **Rate limiting** — 100 requests per 60 seconds globally via ThrottlerModule.

### Module Structure (`src/`)

```
common/         Cross-cutting: config, decorators, enums, guards, filters, interceptors, strategy
models/         Mongoose schemas (one schema per file)
dtos/           Class-validator DTOs (60+)
modules/        Feature modules (each owns its controller, service, module files)
services/       Shared services used across multiple modules
helpers/        Utility functions (password hashing, name masking)
utils/          Pure utilities (distance calculation)
```

### Feature Modules

| Module | Purpose |
|---|---|
| `auth` | JWT login/register, OTP password reset |
| `user` | User profiles, preferences, ban management |
| `restaurant` | Restaurant CRUD, working hours, GeoJSON location |
| `restaurant-application` | Owner onboarding/approval workflow |
| `slot` | Time slot capacity management |
| `reservation` | Table booking, confirmation, cancellation |
| `section` | Restaurant areas (e.g., Private Room, Outdoor) |
| `review` | User ratings with owner reply support |
| `referral-code` | Referral program with discount types |
| `waitlist` | Waitlist for full slots |
| `banner` | Promotional banners |
| `category` | Restaurant type categories |
| `notification` | Multi-channel notifications with scheduled jobs |
| `support-request` | Customer support tickets |
| `upload` | File upload to S3/MinIO |
| `mail` | Email delivery via NodeMailer with templates |
| `webhook` | RevenueCat subscription webhooks |

### Authentication & Authorization

**JWT Strategy** (`src/common/strategy/jwt.strategy.ts`): extracts `sub` from token, verifies user is `Active` in the DB, returns `{userId, email, role, restaurantId}`.

**Role enum** (`src/common/enums/`): `super_admin`, `restaurant_owner`, `user`, `premium_user`, `trial_user`.

**Role compatibility** in `RolesGuard`: the `user` role is treated as compatible with `premium_user` and `trial_user`.

**Guards available:**
- `JwtAuthGuard` — global, can be skipped with `@Public()`
- `RolesGuard` — global, activated by `@Roles()` decorator
- `OptionalJwtAuthGuard` — allows authenticated or anonymous access on the same endpoint
- `ResourceOwnerGuard` — verifies the requesting user owns the resource

### Database

MongoDB via Mongoose with async factory config reading `MONGO_URI` from environment.

**Geolocation:** Restaurant schema uses GeoJSON Point with a `2dsphere` index. Coordinates are stored as `[longitude, latitude]` (GeoJSON order, not lat/lon).

**Reservation dates** are stored as `YYYY-MM-DD` strings, not Date objects.

**Indexes:** Reservation has compound indexes on `{restaurant, date}`, `{slot, date, status}`, and `{customer}`.

### Validation

Global `ValidationPipe` in `main.ts` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. Error messages are in **Turkish**. Never disable whitelist when adding new DTOs.

### File Uploads

UploadModule wraps AWS S3 SDK targeting MinIO (configurable via env). Static files are served at `/uploads` via `ServeStaticModule` mapping to `dist/uploads`.

### Environment Variables

Required vars (see `.env`):
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET_KEY`, `JWT_EXPIRES_IN`, `REFRESH_JWT_SECRET_KEY`, `REFRESH_JWT_EXPIRES_IN`
- `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_REGION`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- `BASE_URL_FRONT` — Frontend URL (used in email templates)
- `PORT` — Server port (default 8080)
