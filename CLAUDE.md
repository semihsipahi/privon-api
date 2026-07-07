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

### Privon Mobile App — Complete Authentication Architecture

This API serves an **invite-only** mobile app with **password-based login** for existing users, OTP-based password reset, and invite-code registration with phone verification. All flows detailed below.

#### Phone Number Check (Entry Point)

**`POST /auth/check-phone`** `@Public()` — First step of onboarding. Queries phone number across 3 collections:
- `users` → if found: `{status:"existing"}` **← NOW: no accessToken; user must login with password**
- `waitlist` → if found: `{status:"waitlist", firstName, lastName, email, birthDate}`
- Neither → `{status:"new"}`
- Banned → `{status:"banned"}`

#### Flow 1: Existing/Invited User — OTP Login (current mobile flow)

**⚠️ This superseded password login for mobile.** `POST /auth/login` (password) still exists and works — `privon-admin` and any future `privon-web` login use it — but the mobile app's onboarding **never calls it**. Do not reintroduce a password screen on mobile without confirming with the user first.

1. **`POST /auth/check-phone`** → `{status:"existing"}` or `{status:"invited", firstName, lastName, email, birthDate}`
2. Mobile navigates to `invited_setup` (single screen: OTP + inline legal consent — `InvitedSetupStep.tsx`)
3. **`POST /auth/send-login-otp`** with `{phoneNumber}` → SMS OTP sent
4. **`POST /auth/verify-login-otp`** with `{phoneNumber, verificationCode}` → `{accessToken, fullName, email, role, imageUrl}`
5. User accepts legal consent inline (see Legal Document System below) → token saved to AsyncStorage → enters app

**Dead code on mobile:** `OtpLoginStep.tsx` and `LegalAcceptanceStep.tsx` are still imported/rendered in `OnboardingFlow.tsx` but their step names are never navigated to — do not build new features on top of them.

**Password login (`/auth/login`, non-mobile only):**
1. **`POST /auth/login`** with `{phoneNumber, password}` → `{accessToken, fullName, email, role, imageUrl}`

**Forgot Password Sub-flow (non-mobile, e.g. admin/web):**
1. **`POST /auth/forgot-password`** with `{phoneNumber}` → generates 6-digit SMS code, saves to `user.verificationCode + codeExpiresAt` (10min)
2. **`POST /auth/verify-reset-code`** with `{phoneNumber, verificationCode}` → returns `{resetToken}` (30-min JWT, purpose: `password_reset`)
3. **`POST /auth/reset-password`** with `{resetToken, newPassword}` → updates `user.password` (bcrypt), returns `{accessToken}`

#### Flow 2: New User → Registration with Invite Code

1. **`POST /auth/check-phone`** → `{status:"new"}`
2. User fills `details` (firstName, lastName, email, birthDate)
3. **`POST /auth/register`** with `{phoneNumber, inviteCode, firstName, lastName, email, birthDate, acceptedMarketing?}` 
   - Validates `inviteCode` via ReferralCodeService
   - Creates user with `isPhoneVerified: false`, `password: null`
   - Returns `{accessToken}` (temporary JWT for phone verification flow)
4. **`POST /auth/resend-code`** (authenticated with temp JWT) — sends SMS OTP
5. **`POST /auth/verify-phone`** with `{verificationCode}` (authenticated) → sets `isPhoneVerified: true`
6. **`POST /auth/set-password`** with `{password}` (authenticated) → hashes + saves password, user is now fully registered
7. Token already in AsyncStorage → User enters app

#### Flow 3: Returning Waitlist User → Invite Code Registration

1. **`POST /auth/check-phone`** → `{status:"waitlist", firstName, lastName, email, birthDate}`
2. User sees `waitlist_pending` screen with pre-filled info from response
3. User clicks "Davet kodunuz geldi mi?" → navigates to `invite_code` screen
4. **`POST /auth/register`** with same flow as Flow 2 (pre-fill fields used automatically)
5. Continues with phone verification → password setting → enters app

#### Flow 4: Waitlist Submission (No App Access)

1. **`POST /auth/check-phone`** → `{status:"new"}`
2. User fills `details` + clicks "Join Waitlist" → navigates to `waitlist_q1/q2/q3`
3. **`POST /waitlist`** with `{phoneNumber, firstName, lastName, email, birthDate, acceptedMarketing, hospitalityStandards, privateClubMemberships, hospitalityValues, agreedToTerms, agreedToPrivacy}`
4. User sees `waitlist_success` → no app access until invited
5. User can later return to `phone` → `check-phone` → `waitlist_pending` → enter invite code (Flow 3)

---

#### Endpoint Reference

| Method | Route | Guard | Payload | Returns |
|---|---|---|---|---|
| POST | `/auth/check-phone` | @Public() | `{phoneNumber}` | `{status, accessToken?, firstName?, lastName?, email?, birthDate?}` |
| POST | `/auth/login` | @Public() | `{phoneNumber, password}` | `{accessToken, fullName, email, role, imageUrl}` (non-mobile clients only) |
| POST | `/auth/send-login-otp` | @Public() | `{phoneNumber}` | `{message}` (mobile OTP login — current flow for existing/invited) |
| POST | `/auth/verify-login-otp` | @Public() | `{phoneNumber, verificationCode}` | `{accessToken, fullName, email, role, imageUrl}` |
| POST | `/auth/register` | @Public() | `{phoneNumber, inviteCode, firstName, lastName, email, birthDate, acceptedMarketing}` | `{accessToken}` |
| POST | `/auth/forgot-password` | @Public() | `{phoneNumber}` | `{message}` |
| POST | `/auth/verify-reset-code` | @Public() | `{phoneNumber, verificationCode}` | `{resetToken}` |
| POST | `/auth/reset-password` | @Public() | `{resetToken, newPassword}` OR `{newPassword}` (+ JWT) | `{accessToken}` |
| POST | `/auth/verify-phone` | JWT | `{verificationCode}` | `{message}` |
| POST | `/auth/set-password` | JWT | `{password}` | `{message}` |
| POST | `/auth/resend-code` | JWT | — | `{message}` |
| POST | `/auth/change-password` | JWT | `{oldPassword, newPassword}` | `{message}` |
| POST | `/waitlist` | @Public() | `{phoneNumber, firstName, lastName, email, birthDate, acceptedMarketing, hospitalityStandards, privateClubMemberships, hospitalityValues, agreedToTerms, agreedToPrivacy}` | `{message}` |

---

#### User Model Fields (Auth-Related)

- `phoneNumber: string` — normalized to 10-digit format (e.g., `5551234567`)
- `password: string` — bcrypt hash; optional until `set-password` is called
- `isPhoneVerified: boolean` (default: false) — must be true before `set-password`
- `verificationCode: string` — SMS OTP for phone verification and password reset
- `codeExpiresAt: Date` — expiry timestamp (10 minutes from generation)
- `status: UserStatus` — Active, Banned, or Passive; checked in login and JWT validation
- `firstName, lastName: string` — collected at registration; pre-filled from waitlist if returning
- `birthDate: string` (YYYY-MM-DD) — collected at registration
- `fullName: string` — pre-save hook concatenates firstName + lastName
- `acceptedMarketing: boolean` — consent flag from registration or waitlist submission
- `registeredWithCode: string` — referral code used (ReferralCode._id)

---

#### SMS & Notification

**OTP/SMS:** Inline in `auth.service.ts` via VatanSMS REST API (`https://api.vatansms.net/api/v1/otp`). Env vars: `SMSUSER`, `SMSPASSWORD`, `SMS_HEADER` (default: `'YemApp'`). 6-digit code, non-cryptographic random, 10-min TTL.

**Email:** Via MailService (Nodemailer). Used for admin password reset links (via `/auth/admin/:id/send-password-reset`). Mobile app does NOT trigger email notifications in auth flow.

---

#### Invite Code (ReferralCode) Lifecycle

- **Created:** Admin panel (`/admin/referral-codes`) specifies `code`, `quota` (max uses), `discount` amount/type
- **Sent:** Admin triggers email to waitlist members (`POST /waitlist/send-mail`)
- **Validated:** On `register` call, `ReferralCodeService.validateCode()` checks:
  - Code exists and is `active`
  - `usedCount < quota`
  - Code is not expired (if `expiresAt` set)
- **Marked Used:** `ReferralCodeService.markCodeUsed()` increments `usedCount`; sets `active: false` if quota reached
- **On User:** User document stores `registeredWithCode: code._id`

---

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

### Rezervem Environment Variables

- `USE_MOCK_REZERVEM` — **MUST be `false` in production.** Coolify manages this env var for production deployment. Local `.env` default is also `false`. Never set to `true` in production — it bypasses the real Rezervem Partner API and returns mock data for only 2 hardcoded slugs (`privon-bosphorus`, `privon-galata`).
- `REZERVEM_BASE_URL` — Rezervem Partner API base URL (`https://partnerapi.rezervem.com.tr`)
- `REZERVEM_CLIENT_ID`, `REZERVEM_CLIENT_SECRET` — Rezervem OAuth credentials (set in Coolify for production)
- `RESTAURANT_SOURCE` — `db` for standard mode (serves from MongoDB); `rezervem` to enable auto-sync on startup

---

## Rezervem Integration Architecture

Privon uses **Rezervem** (a Turkish restaurant reservation platform) as its booking backend. Understanding this is critical before touching anything in `src/modules/rezervem/`.

### How it works — end to end

1. **Sync**: Admin triggers `POST /admin/rezervem/sync` → fetches all venues from Rezervem Partner API → writes to `rezervem_venues` MongoDB collection (cache).

2. **Import**: Admin picks a venue from the list and clicks "Aktar" → `POST /admin/rezervem/venues/:slug/import` → creates a **Restaurant document** in our main `restaurants` collection. This restaurant is now visible in the mobile app with Privon's own UI/design.

3. **Booking flow** (mobile app): When a user taps "Rezervasyon Yap" on an imported restaurant, the entire booking flow runs **through Rezervem's API** (proxied by our backend), not our own slot/reservation system.

4. **Bootstrap**: `GET /booking/venues/:slug/bootstrap` returns pax options, areas, working hours. The API checks `rezervem_venues` cache first; falls back to live Rezervem API only if not cached.

### Our API endpoints (mobile → our backend)

| Step | Mobile calls | Backend proxies to |
|---|---|---|
| Bootstrap | `GET /booking/venues/:slug/bootstrap` | `GET /v1/venues/:slug/bootstrap` |
| Dates | `GET /booking/venues/:slug/availability/dates?pax=N` | `GET /v1/venues/:slug/availability/dates?partySize=N` |
| Times | `GET /booking/venues/:slug/availability/times?pax=N&date=D` | `GET /v1/venues/:slug/availability/times?partySize=N&date=D` |
| Areas | `GET /booking/venues/:slug/availability/areas?pax=N&date=D&time=T` | `GET /v1/venues/:slug/availability/areas?partySize=N&date=D&time=T&shift=S` |
| Hold | `POST /booking/venues/:slug/hold` | `POST /v1/venues/:slug/checkout/hold` |
| Confirm | `POST /booking/holds/:holdId/confirm` | `POST /v1/venues/:slug/checkout/confirm?responseMode=v1` |
| Cancel | `POST /booking/reservation/:id/cancel` | `POST /v1/reservations/cancel` (NEW — body: `{reservationId, cancelReasonId, cancelledBy}`) |

### Response transformation (CRITICAL)

The real Rezervem API returns different field names than the mobile contract. `rezervem-http.service.ts` transforms responses:

- **Dates**: `{dates: [{date, status}], meta}` → `{availableDates: string[]}` (only AVAILABLE/LIMITED dates)
- **Times**: `{shifts: [{shift, times: [{time, status}]}]}` → `{slots: [{time, available}]}`
- **Areas**: `{areas: [{id, title, selectable, status}]}` → `{areas: [{id, name, available, ...}]}`
- **Hold**: `{sessionId, expiresOn}` → `{holdId: "${slug}::${sessionId}", expiresAt, ttlSeconds, ...}`
- **Confirm**: Rezervem response → `{reservationId, holdId, confirmationCode, ...}`
- **Cancel**: (NEW) `POST /v1/reservations/cancel` + `GET /v1/reservations/cancel-reasons` — implemented in `rezervem-http.service.ts`, consumed via `rezervem.provider.ts::cancelReservation()`. Uses `CancelReservationRequest` body: `{reservationId, cancelReasonId, cancelledBy, cancelNote?}`.
- **BookingFlow**: (BREAKING) `steps` format changed from `string[]` to `object[]` with `{type, order, required, enabled, title}`. Fields `type` and `requiresApproval` removed; `areaRequired` added. Default fallback in `rezervem.provider.ts` updated accordingly.
- **Bootstrap + weeklySchedule**: `VenueBootstrapResponse` now includes `weeklySchedule` (`WeeklyScheduleDayInfo` — weekly schedule). `VenueInfo.workingHours` type changed from `string` to `array<WeeklyScheduleDayInfo>`.
- **UiHints**: 5 new booleans: `showTimeSession`, `hideMaxPaxAlert`, `showEventsInTheShift`, `dontShowNotes`, `showRecommendations`.

### HoldId encoding

Hold response encodes the Rezervem `sessionId` as `"${slug}::${sessionId}"` in the `holdId` field. When `POST /booking/holds/:holdId/confirm` arrives, the backend splits on `::` to recover both the slug and sessionId, then calls the proper Rezervem confirm endpoint. Never change this encoding without updating both `holdSlot` transform and `confirmHold`.

### Shift parameter

Rezervem areas endpoint requires a `shift` parameter (0=Breakfast, 1=Lunch, 2=Dinner, 3=Bar). The `booking.controller.ts` auto-infers shift from the selected time using `shiftFromTime()` when not explicitly provided.

### Confirm body (Rezervem format)

```json
{
  "sessionId": "uuid-from-hold",
  "model": {
    "client": {
      "firstName": "...",
      "lastName": "...",
      "phoneNumberCountryCode": "90",
      "phoneNumber": "5XXXXXXXXX",
      "emailAddress": "..."
    },
    "femaleCount": 0,
    "note": "...",
    "hasCakeDelivery": false,
    "hasFlowerDelivery": false,
    "needInvoice": false
  }
}
```

### Key rules
- Restaurants imported from Rezervem have `rezervemSlug` set on the Restaurant document.
- The mobile app uses `rezervemSlug` to route booking calls to Rezervem.
- Our own `reservation` module is for non-Rezervem restaurants only.
- **Never remove or rename `rezervemSlug`** on the Restaurant schema — it is the link between our DB and Rezervem's booking API.
- `USE_MOCK_REZERVEM=false` in production. Mocks only work for `privon-bosphorus` and `privon-galata` slugs.

### Restaurant Schema — Terms & Conditions

The `restaurant.schema.ts` has a `termsAndConditions?: string` field (added for Rezervem restaurants). This field:
- Is set during **venue import** via `ImportRezervemVenueDto.termsAndConditions`
- Can be edited from **admin panel** (Rezervem Settings tab)
- Is injected into the **bootstrap response** at `GET /booking/venues/:slug/bootstrap` under `policies.termsAndConditions`
- The mobile app reads this from `bootstrap.policies.termsAndConditions` and displays it in the review step
- The field is stored on the `Restaurant` document (not on `rezervem_venues` cache)

### Coolify deployment
- Coolify watches `PRIVONco/privon-api` (origin remote). **Every push must go to both remotes:**
  ```bash
  git push origin main && git push personal main
  ```
- Coolify does **not** auto-deploy on push — deployment must be manually triggered from the Coolify dashboard after push.

---

## Multi-Provider Booking Architecture

Booking is **provider-agnostic**. `src/modules/booking/` is the orchestrator; it never talks to Rezervem or MozRest directly — it goes through `BookingProviderRegistry`, which resolves `provider.name` ('rezervem' | 'mozrest') on the `Restaurant` document to the right `BookingProvider` implementation (`src/common/interfaces/booking-provider.interface.ts`). Mobile only ever sees `restaurant.slug`/`venueId` and the normalized mobile contract — it never knows which provider is behind a given restaurant.

- `src/modules/booking/booking.module.ts` registers both providers on `onModuleInit()`: `registry.register('rezervem', ...)`, `registry.register('mozrest', ...)`.
- `Restaurant.provider = { name: 'rezervem' | 'mozrest', venueId: string }` — this replaces the legacy `rezervemSlug` field (still read for backward compat, never write to it).
- Each provider is fully responsible for transforming its own raw API response into the shared mobile contract (dates/times/areas/hold/confirm/cancel shapes) — see the Rezervem section above for that provider's transform rules.
- `pnpm run migrate:provider` (`scripts/migrate-provider-field.ts`) — one-time migration that maps legacy `rezervemSlug` values to `{name: 'rezervem', venueId: rezervemSlug}`. Only needed once per environment; don't re-run against already-migrated data without checking the script's idempotency first.

## MozRest Integration Architecture

MozRest is the second `BookingProvider` implementation, parallel to Rezervem. Full raw API reference: **`.opencode/context/mozrest-api-doc.md`** (venues, areas, availability, pending-booking, booking, payments, webhooks — read this before changing provider behavior).

### Key files
- `src/modules/booking/providers/mozrest/mozrest.provider.ts` — `BookingProvider` implementation, calls the MozRest REST API directly (no OAuth — static Bearer token)
- `src/modules/booking/providers/mozrest/mozrest-venue.service.ts` — sync (`syncAll`) + import (`importToRestaurant`) into our `restaurants` collection
- `src/modules/booking/providers/mozrest/mozrest-venue.schema.ts` — `mozrest_venues` cache collection (mirrors Rezervem's `rezervem_venues` cache pattern)
- `src/modules/booking/providers/mozrest/mozrest-admin.controller.ts` — `admin/mozrest/*` routes, `@Roles(Role.SuperAdmin)`
- `src/dtos/import-mozrest-venue.dto.ts` — import payload (categories, price level, awards, cuisine types — same shape as Rezervem import)

### Sync → Import flow (mirrors Rezervem)
1. `POST /admin/mozrest/sync` → `MozRestVenueService.syncAll()` fetches all venues from MozRest, upserts into `mozrest_venues` cache (includes a best-effort area fetch per venue; failures there are swallowed since availability may be empty "today").
2. Admin picks a cached venue → `POST /admin/mozrest/venues/:venueId/import` → creates/updates a `Restaurant` document with `provider: { name: 'mozrest', venueId }`.
3. `isImported` is derived by checking `Restaurant.find({ 'provider.name': 'mozrest', 'provider.venueId': venueId })` — never a separate flag on the cache document.

### Critical differences from Rezervem
- **Dates/times are Unix epoch seconds**, not ISO strings. `mozrest.provider.ts` converts `date`/`time` to `Math.floor(new Date(...).getTime() / 1000)` before every request and converts back on responses (`nextAvailability`/`previousAvailability`).
- **No dedicated "available dates" endpoint** — `getAvailableDates()` throws; MozRest only exposes per-date availability (`GET /availability`). Date-level UI has to be driven off `getAvailableTimes()` + its `nextAvailability`/`previousAvailability` hints.
- **Hold is two-step via the same resource**: `POST /pending-booking` creates the hold (`holdId = raw.id`, no separate encoding needed — MozRest IDs are already opaque strings, unlike Rezervem's `slug::sessionId`), then `PUT /pending-booking/:id` both fills in guest details *and* confirms/triggers payment in the same call.
- **Payment is a widget, not a backend call**: if `confirmHold()` gets back `{status: 'require_payment', mzPaymentUrl}`, we return `paymentRequired: true, paymentUrl, paymentType: 'mozrest_widget'` — the client embeds MozRest's payment iframe; there is no follow-up "finalize" call from our backend for the common case. `finalizeHold()` exists only as a manual fallback (`GET /booking/:id`).
- **Areas endpoint** takes `mzId` (not `venueId`) as the query param — easy typo trap when touching `getAvailableAreas()`.

### Env vars
- `MOZREST_BASE_URL` (default `https://api-sandbox.mozrest.com/v1/bc`) — switch to the production base URL when going live; there is no separate `USE_MOCK_MOZREST` flag like Rezervem has.
- `MOZREST_API_KEY` — static Bearer token, no OAuth client id/secret pair like Rezervem.

### Admin panel (privon-admin)
- `src/api/mozrest.ts`, `src/pages/admin/integrations/mozrest/{list,show,import-drawer}.tsx` — copies of the Rezervem admin UI pattern, adapted field-for-field.
- Business list/show/edit pages render a provider badge (Rezervem green / MozRest blue "M") driven off `Restaurant.provider.name`.

---

## Legal Document System

`LegalDocument` model in MongoDB, CRUD + versioning, consumed by mobile onboarding and `privon-admin`.

- `src/modules/legal/legal.controller.ts` — `GET /legal/documents/:type` is `@Public()` (no JWT required, so waitlist users can read terms/privacy before they have a token).
- `src/modules/user/user.controller.ts` + `user.service.ts` — `resetLegalConsent`: forces a user to re-accept the latest version (admin-triggered).
- User document tracks `acceptedAt`, `acceptedVersion` per document type — for admin visibility only, **not** used to skip showing the document again. There is intentionally no "already accepted, don't show" logic anywhere in the flow — the latest version is always shown.
- Consumed by mobile via `requestWithOptionalAuth()` (sends token if present, works without one otherwise) — see `privon/CLAUDE.md` → "Legal Document System (mobile side)".
- Admin CRUD for documents, version history, and "request re-acceptance from users" lives in `privon-admin` — see `privon-admin/CLAUDE.md`.
- **`privon-web`'s `TermsOfAccess.tsx`/`PrivacyNotice.tsx` are fully hardcoded and do NOT call this API** — they can drift out of sync with the versions mobile shows. If legal copy changes, it must be updated in both places until `privon-web` is migrated to fetch from this endpoint.
