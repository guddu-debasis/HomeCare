# Hearth (HomeCare)

A full-stack home-services booking platform: customers browse services, book a
seller/provider, pay online via Razorpay, and track/cancel/rate their
bookings. Admins and sellers manage the service catalog and offerings.

**Stack**
- **Backend** — Node.js, Express 5, Drizzle ORM + PostgreSQL, JWT auth, Joi
  validation, Razorpay (payments + webhooks), Nodemailer
- **Frontend** (`homecare-frontend/`) — React 19, Vite, Tailwind CSS v4,
  React Router, Axios

## Project structure

```
HomeCare/
├── server.js                  Entry point
├── drizzle.config.js          Drizzle Kit config
├── drizzle/                   Generated SQL migrations
├── src/
│   ├── app.js                 Express app, route mounting, CORS, error handler
│   ├── common/
│   │   ├── config/            db.js (Postgres pool), razorpay.js
│   │   ├── dto/                BaseDto (Joi wrapper)
│   │   ├── middlewares/        auth, validate, error handler
│   │   └── utils/               ApiError, ApiResponse, JWT, email
│   ├── db/schema.js             Drizzle table definitions
│   └── modules/
│       ├── admin/  seller/  customer/     auth + account management
│       ├── cart/  order/  payment/         booking + checkout flow
│       ├── service/  seller-service/       service catalog
│       └── ratings/                         seller reviews
└── homecare-frontend/
    └── src/
        ├── lib/                api.js, format.js, ui.js
        ├── context/             Auth, Theme, Toast
        ├── components/
        └── pages/               Home, Login, Register, SellerProfile, ...
                                  customer/ (Cart, Orders, OrderDetail)
                                  seller/ (MyServices)
                                  admin/ (ManageServices)
```

## Prerequisites

- Node.js 18+
- A running PostgreSQL instance
- A [Razorpay](https://razorpay.com) account (test-mode keys are enough for development)

## Setup

### 1. Backend

```bash
npm install
cp .env.example .env   # then fill in real values, see table below
npm run db:migrate     # applies drizzle/*.sql to your database
npm run dev            # starts the API on PORT (default 5000)
```

### 2. Frontend

```bash
cd homecare-frontend
npm install
cp .env.example .env   # set VITE_API_URL if the backend isn't on :8000/:5000
npm run dev            # starts Vite on :5173
```

## Environment variables

### Backend (`.env`)

| Variable | Purpose |
|---|---|
| `PORT` | Port the Express server listens on |
| `NODE_ENV` | `development` / `production` |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Signing secrets for access/refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (e.g. `15m`, `7d`) |
| `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP credentials used for password-reset emails |
| `CLIENT_URL` | Frontend origin, used for CORS |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | From Razorpay Dashboard → Settings → API Keys |
| `RAZORPAY_WEBHOOK_SECRET` | From Razorpay Dashboard → Settings → Webhooks, see below |

### Frontend (`homecare-frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

## Available scripts

**Backend** (run from repo root)
| Command | Description |
|---|---|
| `npm run dev` | Start the API with nodemon |
| `npm run db:generate` | Generate a new Drizzle migration from `src/db/schema.js` |
| `npm run db:migrate` | Apply pending migrations in `drizzle/` to the database |

**Frontend** (run from `homecare-frontend/`)
| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint |

## API overview

Auth-and-account routes are mounted under `/app/v1/*`; everything else is
under `/api/v1/*` — that split is how the backend currently mounts things.

| Area | Base path | Notes |
|---|---|---|
| Admin | `/app/v1/admin` | register, login, logout, refresh-token, forgot/reset-password |
| Seller | `/app/v1/seller` | account + `GET/PATCH bookings`, `GET/PATCH notifications` |
| Customer | `/app/v1/customer` | account management |
| Cart | `/app/v1/cart` | `GET /`, `POST /`, `DELETE /:id` (customer-only) |
| Orders | `/api/v1/orders` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id/cancel` (customer-only) |
| Services (catalog) | `/api/v1/services` | `GET /` public; `POST /` admin/seller; `DELETE /:id` admin |
| Seller-Services (offerings) | `/api/v1/seller-services` | public reads; seller-only writes |
| Ratings | `/api/v1/ratings` | public `GET /seller/:sellerId`; customer-only `POST /` |
| Payments | `/api/v1/payments` | see below |
| Universal password reset | `/app/v1/auth/reset-password` | tries customer → seller → admin by token |

### Payment flow

1. `POST /api/v1/payments/orders/:orderId/create` — creates a Razorpay order
   for an existing booking and returns `{ razorpayOrderId, amount, currency, keyId }`.
2. The frontend opens Razorpay Checkout with those values.
3. On success, the frontend calls `POST /api/v1/payments/verify` with the
   Razorpay order/payment IDs and signature; the backend verifies the HMAC
   signature and marks the booking `paid`.
4. `POST /api/v1/payments/webhook` — a server-to-server fallback. Razorpay
   calls this directly (no user token) when a payment is `captured` or
   `failed`, so a booking still gets marked correctly even if the customer's
   browser closes before step 3 completes.

**Setting up the webhook** (Razorpay Dashboard → Settings → Webhooks):
- **Webhook URL:** `https://<your-domain>/api/v1/payments/webhook`
  (use an `ngrok http <port>` tunnel URL for local development)
- **Secret:** generate one (e.g. `openssl rand -hex 32`) and put the same
  value in `RAZORPAY_WEBHOOK_SECRET`
- **Active events:** `payment.captured`, `payment.failed`

This step is optional for local development/testing — the app works without
it, it just adds a safety net for the "customer paid but connection dropped"
edge case.

## Notes / known gaps

- There's no endpoint to browse/search sellers by service — only
  `GET /api/v1/seller-services/seller/:sellerId`, which requires already
  knowing a seller's ID. The frontend works around this with a "look up a
  provider by ID" flow.
- Payments only settle to a real bank account once you switch from
  `rzp_test_...` keys to live keys and complete KYC/activation on the
  Razorpay Dashboard.
