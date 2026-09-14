# Hearth — frontend for the HomeCare backend

React + Vite + Tailwind v4 frontend for the `HomeCare` Express/Drizzle backend,
built directly against its actual routes, DTOs, and DB schema.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL if your backend isn't on :8000
npm run dev
```

## Before it'll fully work: two backend changes needed

**1. Mount the seller-service and ratings routers.** They exist in the
codebase but aren't wired into `src/app.js`. Add:

```js
import sellerServiceRoutes from "./modules/seller-service/seller-service.routes.js";
import ratingsRoutes from "./modules/ratings/ratings.routes.js";
// ...
app.use("/api/v1/seller-services", sellerServiceRoutes);
app.use("/api/v1/ratings", ratingsRoutes);
```

Until then, provider profile pages will show "no offerings / no reviews"
even when data exists, and sellers can't manage their listings.

**2. Add CORS.** Nothing in the backend currently sends
`Access-Control-Allow-Origin`, so the browser will block every request from
this app's origin (`localhost:5173` in dev).

```bash
npm install cors
```
```js
import cors from "cors";
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
```

## A gap in the API worth knowing about

There's no endpoint to list or search sellers/providers — only
`GET /api/v1/seller-services/seller/:sellerId`, which requires already
knowing a seller's ID. So there's currently no way for a customer to
*discover* providers by browsing.

The frontend works around this with a "look up a provider by ID" box on the
home page, and each seller's dashboard shows them their own `/sellers/:id`
link to share with customers directly. If you want real discovery (browse →
see who offers a service near you), you'll want to add something like
`GET /api/v1/services/:id/sellers` or `GET /api/v1/sellers` on the backend.

## Notes on how this maps to the backend

- API calls live in `src/lib/api.js`, one function per route, using the
  exact paths as mounted in `app.js` — including the `/app/v1/*` vs
  `/api/v1/*` split, which is how the backend currently mounts things (not a
  typo here).
- Auth: JWT access token in `localStorage`, sent as `Authorization: Bearer`.
  Session (role + user + refresh token) also cached locally. There's no
  token-refresh-on-401 interceptor yet — add one against
  `POST /app/v1/<role>/refresh-token` if sessions need to outlive the access
  token's lifetime.
- Customer register/login require a literal `role: "customer"` field in the
  body, per `customer/dto/*.dto.js` — seller/admin don't. This is preserved
  as-is.
- Customer's `name` field is validated as `alphanum()` server-side (no
  spaces) — the form enforces the same pattern client-side.
- Response envelope `{ success, message, data }` is unwrapped centrally in
  the axios interceptor, so page code just uses `res.data`.

## Structure

```
src/
  lib/api.js          all backend calls
  lib/format.js         money/date formatting
  lib/ui.js              shared Tailwind class strings
  context/AuthContext.jsx
  components/            Navbar, ProtectedRoute, Stars, StatusBadge
  pages/
    Home, Login, Register, SellerProfile, NotFound
    customer/  Cart, Orders, OrderDetail
    seller/    MyServices
    admin/     ManageServices
```
