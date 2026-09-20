# Hearth (HomeCare)

A full-stack home-services booking platform. Customers browse a service
catalog, book a specific seller/provider, pay online via Razorpay, and
track/cancel/rate their bookings. Sellers manage their own service listings
and respond to bookings. Admins manage the master catalog and review
seller listings before they go live.

---

## Table of contents

- [Stack](#stack)
- [Architecture at a glance](#architecture-at-a-glance)
- [Project structure](#project-structure)
- [Backend](#backend)
  - [Request lifecycle](#request-lifecycle)
  - [DTOs & Joi validation](#dtos--joi-validation)
  - [Drizzle ORM + PostgreSQL](#drizzle-orm--postgresql)
  - [Redis (Upstash)](#redis-upstash)
  - [Auth](#auth)
  - [Error handling](#error-handling)
- [Frontend (UI)](#frontend-ui)
- [Setup](#setup)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [API reference](#api-reference)
- [Known gaps / notes](#known-gaps--notes)

---

## Stack

| Layer | Technology |
|---|---|
| **Backend runtime** | Node.js, Express 5 |
| **Database** | PostgreSQL (via `pg` / Neon serverless driver) |
| **ORM** | Drizzle ORM + Drizzle Kit |
| **Validation** | Joi, via a small `BaseDto` wrapper |
| **Cache / ephemeral state** | Upstash Redis (REST client) — live shopping cart, unread notification counters |
| **Auth** | JWT (access + refresh), Google OAuth (Passport.js) |
| **Payments** | Razorpay (checkout + server-side verification + webhook) |
| **Email** | Nodemailer |
| **Frontend** | React 19, Vite, Tailwind CSS v4, React Router 7, Axios |

---

## Architecture at a glance

```
 Browser (React SPA)
      │  axios, JWT in Authorization header
      ▼
 Express app (src/app.js)
      │
      ├─ CORS → express.json() → routes → ── error middleware (last, catches everything)
      │
      ▼
 routes/*.routes.js  →  validate(Dto) middleware  →  controller  →  service  →  Drizzle  →  PostgreSQL
                                                              │
                                                              └─→  Redis (cart, unread counts)
                                                              └─→  Razorpay API (payments)
                                                              └─→  Nodemailer (password reset emails)
```

Every module (`admin`, `seller`, `customer`, `cart`, `order`, `service`,
`seller-service`, `ratings`, `payment`) follows the same four-file shape:

```
modules/<name>/
├── <name>.routes.js       Express Router — path + middleware wiring only
├── <name>.controller.js   req/res handling, calls into the service, never touches the DB directly
├── <name>.service.js      All business logic + Drizzle queries live here
└── dto/*.dto.js           Joi schemas, one per validated endpoint
```

---

## Project structure

```
HomeCare/
├── server.js                     Entry point
├── drizzle.config.js              Drizzle Kit config
├── drizzle/                       Generated SQL migrations + snapshots (see below)
├── src/
│   ├── app.js                     Express app: CORS, body parsing, route mounting, error handler
│   ├── common/
│   │   ├── config/                db.js (Postgres pool), redis.js (Upstash client),
│   │   │                          razorpay.js, passport.js (Google OAuth strategies)
│   │   ├── dto/                   BaseDto — the Joi validation wrapper every DTO extends
│   │   ├── middlewares/           auth.middleware.js, validate.middleware.js, error.middleware.js
│   │   └── utils/                 ApiError, ApiResponse, jwt.utils.js, email.utils.js, order-status.util.js
│   ├── db/schema.js               Every Drizzle table + enum definition — the single source of truth for the DB shape
│   └── modules/
│       ├── admin/  seller/  customer/       auth + account management (register/login/refresh/reset)
│       ├── cart/                             live cart (Redis-backed, see below)
│       ├── order/                            checkout, booking status, cancellation
│       ├── payment/                          Razorpay order creation, verification, webhook
│       ├── service/                          master service catalog (admin/seller managed)
│       ├── seller-service/                   a seller's own listing against a catalog service
│       └── ratings/                           customer → seller reviews
└── homecare-frontend/
    └── src/
        ├── lib/                    api.js (every backend call), format.js, ui.js (shared Tailwind classes)
        ├── context/                 AuthContext, ToastContext, ThemeContext
        ├── components/              Navbar, NotificationBell, Modal, Footer, PageLoader, ...
        └── pages/
            ├── Home, Login, Register, SellerProfile, ResetPassword, OAuthCallback, NotFound
            ├── customer/             Cart, Orders, OrderDetail
            ├── seller/               MyServices
            └── admin/                ManageServices, PendingListings
```

---

## Backend

### Request lifecycle

A typical write request — say, `POST /api/v1/orders` — flows through five
layers, each with one job:

1. **Route** (`order.routes.js`) — declares the path, which auth middleware
   applies (`verifyAuth`, `verifyCustomer`, ...), and which DTO validates
   the body.
2. **`validate.middleware.js`** — runs the DTO's Joi schema against
   `req.body`. On failure, throws an `ApiError.badRequest` immediately;
   the controller/service never see invalid data.
3. **Controller** (`order.controller.js`) — thin. Pulls what it needs from
   `req` (`req.user.id`, `req.params`, the now-validated `req.body`), calls
   exactly one service function, and shapes the response via `ApiResponse`.
   Every controller function is wrapped in `try/catch` that calls
   `next(error)` — it never handles errors itself.
4. **Service** (`order.service.js`) — all business logic and every Drizzle
   query lives here. Controllers never import `db` or `schema.js` directly.
5. **Error middleware** (mounted last in `app.js`) — catches anything any
   layer threw and turns it into a consistent JSON error response.

### DTOs & Joi validation

Every DTO extends `BaseDto` (`src/common/dto/base.dto.js`):

```js
class BaseDto {
  static schema = Joi.object({});

  static validate(data) {
    const { error, value } = this.schema.validate(data, {
      abortEarly: false,   // collect every validation error, not just the first
      stripUnknown: true,  // silently drop fields the schema doesn't know about
    });
    if (error) return { errors: error.details.map((d) => d.message), value: null };
    return { errors: null, value };
  }
}
```

A DTO is just that class with its own `schema`:

```js
// src/modules/order/dto/create-order.dto.js
class CreateOrderDto extends BaseDto {
  static schema = Joi.object({
    bookingDate: Joi.date().iso().custom(withinBookingWindow).required(),
  });
}
```

`withinBookingWindow` is a custom Joi validator in the same file — used
whenever a rule can't be expressed as a built-in Joi constraint (here: the
booking date must be within the next 7 days, compared as calendar dates
rather than exact timestamps, so "today" doesn't get rejected once any
time has passed since midnight).

`validate.middleware.js` wires a DTO to a route:

```js
router.post("/", validate(CreateOrderDto), createNewOrder);
```

On success, `req.body` is **replaced** with the validated (and
`stripUnknown`-cleaned) value — the controller always sees sanitized data,
never the raw request body.

### Drizzle ORM + PostgreSQL

`src/db/schema.js` is the single source of truth for the database shape —
every table, column, enum, and foreign key is defined there as plain JS,
and every service function imports table objects from it to build queries
with Drizzle's query builder (`db.select()...`, `db.insert()...`, etc.).

**Tables:**

| Table | Purpose |
|---|---|
| `Customers` / `Seller` / `Admin` | The three account types — separate tables, not a shared `users` table with a role column |
| `Service` | The master catalog — a name and base price, managed by admins/sellers |
| `Seller_Service` | A specific seller's listing against a catalog `Service` — their own price/description. Has `verificationStatus` (`pending`/`approved`/`rejected`) + `rejectionReason` for admin moderation |
| `Cart_Items` | **Unused as of the Redis cart rewrite** — kept in the schema for now, nothing reads/writes it (see [Redis](#redis-upstash)) |
| `Order/Booking` | A checkout — `status` here is a **rollup** derived from its items, not written directly (see below) |
| `Order_Items` | One line per (service, seller) in a booking. Each has its **own** `status` — a combined booking can have several sellers, and one accepting/declining their line never affects anyone else's |
| `Ratings` | A customer's review of a seller, tied to a specific `bookingId` |
| `Notifications` | Unified table for both seller and customer notifications — `sellerId`/`customerId` are both nullable, exactly one is set per row |

**Enums:** `payment_status` (`pending`/`paid`/`failed`/`refunded`),
`booking_status` (`pending`/`accepted`/`completed`/`cancelled`),
`verification_status` (`pending`/`approved`/`rejected`).

**The per-item status rollup:** `orderBooking.status` is never set
directly by a seller action — `order-status.util.js#deriveOverallOrderStatus`
computes it from every `Order_Items.status` in that booking (all cancelled
→ `cancelled`; all completed → `completed`; all accepted-or-completed →
`accepted`; otherwise `pending`). Both `order.service.js` (customer
cancel) and `seller.service.js#updateBookingStatus` (seller accept/decline/
complete) update a specific item's status, then recompute and write the
parent's rollup from *every* item — never the reverse.

**Migration workflow — three different commands, worth knowing apart:**

| Command | What it does |
|---|---|
| `npx drizzle-kit generate` | Diffs `schema.js` against the last recorded snapshot in `drizzle/meta/`, writes a new `.sql` migration file. Touches **no** database. |
| `npx drizzle-kit migrate` | Runs any `.sql` files in `drizzle/` not yet listed in `drizzle/meta/_journal.json` against the real database, in order. Never looks at `schema.js` directly — only at migration files that already exist. |
| `npx drizzle-kit push` | Introspects the **live** database, diffs it directly against `schema.js`, and applies the difference immediately — no file, no history. |

This project uses `push` day-to-day (fast iteration, no migration-file
ceremony), with a few `generate`d migrations from earlier in `drizzle/` for
history. **`push` will offer to *delete* a column if it exists in the
database but isn't in `schema.js`** — always read what it says it's about
to do before confirming; it has no way to know whether a mismatch means
"add this" or "someone forgot to declare this in the file."

### Redis (Upstash)

Two independent uses, both via the same REST client (`src/common/config/redis.js`):

- **Live cart** (`cart.service.js`) — a customer's cart is a Redis hash
  (`cart:customer:{id}`), one field per `serviceId:sellerId` line, value =
  quantity. Nothing touches Postgres between "add to cart" and checkout —
  the quantity `+`/`-` stepper is a single `HINCRBY`, no DB round trip.
  Postgres is only read (once, batched) to attach current names/prices
  for display, and only written to at checkout, when the cart is read one
  final time and then cleared (`DEL`) — but only *after* the order's
  Postgres transaction actually commits, never before. A 30-day TTL,
  refreshed on every mutation, cleans up abandoned carts. `Cart_Items` (the
  Postgres table) predates this and is unused now.
- **Unread notification counts** (`seller.service.js` / `customer.service.js`) —
  `unread:seller:{id}` / `unread:customer:{id}` integer counters,
  incremented whenever a notification is inserted and reset on
  mark-as-read, so the navbar badge doesn't require scanning the full
  notification list on every page load.

### Auth

JWT access + refresh tokens, issued per role (`admin`/`seller`/`customer`
each have their own account table and their own login/register/refresh
endpoints). `verifyAuth` middleware checks the access token; role-specific
middlewares (`verifyAdmin`, `verifySeller`, `verifyCustomer`) additionally
check the token's `role` claim. Google OAuth (`passport-google-oauth20`) is
available for customer and seller sign-in as an alternative to
email/password.

### Error handling

Every thrown error — from a DTO validation failure, an `ApiError.notFound()`
in a service, or anything unexpected — is caught by the error middleware
mounted last in `app.js` and returned as
`{ success: false, message, errors? }` JSON, never Express's default HTML
error page.

---

## Frontend (UI)

- **Routing** — `App.jsx`, React Router 7. Every route is `React.lazy`-loaded
  and wrapped in a single `<Suspense>` with a themed `PageLoader` fallback,
  so the initial bundle only ships the code for whichever page was actually
  requested.
- **`lib/api.js`** — every single backend call lives here, grouped by
  resource (`cartApi`, `ordersApi`, `sellerServicesApi`, `adminApi`, ...).
  Pages never call `axios`/`fetch` directly. A response interceptor unwraps
  the backend's `{ success, message, data }` envelope, so page code just
  reads `res.data`.
- **Contexts** — `AuthContext` (current user/role/token, login/logout),
  `ToastContext` (`showSuccess`/`showError`, used everywhere instead of
  inline error text), `ThemeContext`.
- **`ProtectedRoute`** — wraps role-gated routes, redirects to `/login` if
  unauthenticated or to `/` if the role doesn't match.
- **Design** — dark theme, Tailwind utility classes directly (no component
  library), a small set of shared class strings in `lib/ui.js`
  (`btnPrimary`, `btnSecondary`, `input`, ...) rather than a full design
  system.
- **Razorpay checkout.js** is loaded on-demand from `Cart.jsx` (started in
  the background on mount, awaited before actually opening checkout) rather
  than in `index.html` — it was previously render-blocking on every single
  page, including ones that never touch payment.

---

## Setup

### Prerequisites

- Node.js 18+
- A running PostgreSQL instance
- An [Upstash Redis](https://console.upstash.com) database (free tier is enough)
- A [Razorpay](https://razorpay.com) account (test-mode keys are enough for development)
- (Optional) A Google OAuth client, if you want "Sign in with Google"

### 1. Backend

```bash
npm install
cp .env.example .env   # fill in real values — see table below
npx drizzle-kit push   # sync the database to match src/db/schema.js
npm run dev            # starts the API on PORT (default 5000)
```

### 2. Frontend

```bash
cd homecare-frontend
npm install
cp .env.example .env   # set VITE_API_URL if the backend isn't on :5000
npm run dev            # starts Vite on :5173
```

---

## Environment variables

### Backend (`.env`)

| Variable | Purpose |
|---|---|
| `PORT` | Port the Express server listens on |
| `NODE_ENV` | `development` / `production` |
| `DATABASE_URL` | Postgres connection string |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | From your Upstash database's REST API tab |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets for access/refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (e.g. `15m`, `7d`) |
| `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP credentials used for password-reset emails |
| `CLIENT_URL` | Frontend origin — used for CORS and OAuth redirects |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Settings → Webhooks (see payment flow below) |
| `ADMIN_SETUP_SECRET` | Required as an `x-setup-secret` header to hit `POST /app/v1/admin/register` — otherwise anyone could create an admin account |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console OAuth client, for "Sign in with Google" |

### Frontend (`homecare-frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

---

## Available scripts

**Backend** (repo root)

| Command | Description |
|---|---|
| `npm run dev` | Start the API with nodemon |
| `npm run db:generate` | Generate a migration file from the current `schema.js` diff |
| `npm run db:migrate` | Apply any not-yet-applied migration files in `drizzle/` |
| `npx drizzle-kit push` | Sync the live database directly to `schema.js` (not in `package.json`, run via `npx`) |

**Frontend** (`homecare-frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | oxlint |

---

## API reference

Auth-and-account routes are mounted under `/app/v1/*`; everything else is
under `/api/v1/*` — that split is how the backend currently mounts things,
not a typo.

| Area | Base path | Notes |
|---|---|---|
| Admin | `/app/v1/admin` | register (requires `x-setup-secret`), login, logout, refresh-token, forgot/reset-password |
| Seller | `/app/v1/seller` | account + Google OAuth; `GET /bookings`, `PATCH /bookings/:id/status`; `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Customer | `/app/v1/customer` | same shape as Seller above, customer-scoped |
| Cart | `/app/v1/cart` | `GET /`, `POST /`, `GET /count`, `PATCH /increment`, `DELETE /:serviceId/:sellerId` — all customer-only, all Redis-backed |
| Orders | `/api/v1/orders` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id/cancel` (whole order), `PATCH /:id/items/:itemId/cancel` (one line in a combined order) — customer-only |
| Services (catalog) | `/api/v1/services` | `GET /` public; `POST /` admin/seller; `DELETE /:id` admin |
| Seller-Services (a seller's own listings) | `/api/v1/seller-services` | `GET /`, `GET /service/:serviceId`, `GET /seller/:sellerId` public; `POST /`, `PATCH|PUT /:serviceId`, `DELETE /:serviceId` seller-only |
| Ratings | `/api/v1/ratings` | public `GET /seller/:sellerId`; customer-only `POST /` |
| Payments | `/api/v1/payments` | see payment flow below |

### Payment flow

1. `POST /api/v1/payments/orders/:orderId/create` — creates a Razorpay
   order for an existing booking, returns
   `{ razorpayOrderId, amount, currency, keyId }`.
2. Frontend opens Razorpay Checkout with those values.
3. On success, frontend calls `POST /api/v1/payments/verify` with the
   Razorpay order/payment IDs and signature; the backend verifies the HMAC
   signature and marks the booking `paid`.
4. `POST /api/v1/payments/webhook` — server-to-server fallback, no user
   token (Razorpay calls it directly). Authenticity comes from verifying
   `x-razorpay-signature`, not auth middleware — registered *before*
   `verifyAuth` in `payment.routes.js` for exactly that reason.

**Setting up the webhook** (Razorpay Dashboard → Settings → Webhooks):
- **URL:** `https://<your-domain>/api/v1/payments/webhook` (use an
  `ngrok http <port>` tunnel for local development)
- **Secret:** generate one (e.g. `openssl rand -hex 32`), put the same
  value in `RAZORPAY_WEBHOOK_SECRET`
- **Events:** `payment.captured`, `payment.failed`

Optional for local dev/testing — the app works without it, it's a safety
net for "customer paid but the connection dropped before step 3."

---

## Known gaps / notes

- **Seller listing moderation is currently non-functional at the code
  level, despite the database supporting it.** `Seller_Service` has
  `verificationStatus`/`rejectionReason` columns with real historical
  data, but `seller-service.service.js` no longer filters any customer-
  facing read by approval status, and the admin review endpoints
  (list-pending, approve/reject) don't currently exist in
  `admin.controller.js`/`admin.routes.js`. Practically: **any seller
  listing is visible to customers right now, including ones that were
  previously rejected.** This was a working, tested feature earlier and
  appears to have been reverted along with an unrelated schema change —
  worth restoring deliberately rather than leaving as-is.
- There's no endpoint to browse/search sellers by service from scratch —
  only `GET /api/v1/seller-services/seller/:sellerId`, which requires
  already knowing a seller's ID.
- Payments only settle to a real bank account once you switch from
  `rzp_test_...` keys to live keys and complete KYC/activation on the
  Razorpay Dashboard.
- `Cart_Items` (Postgres table) is fully superseded by the Redis cart and
  unused in code — safe to drop in a future migration, kept for now.
