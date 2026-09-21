import axios from "axios";

// Matches src/app.js exactly as mounted on the backend.
// NOTE: admin/seller/customer/cart live under /app/v1, orders/services
// live under /api/v1 — that split is how the backend currently mounts
// them, not a typo here.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: BASE_URL });

const TOKEN_KEY = "homecare.accessToken";
const SESSION_KEY = "homecare.session"; // { role, refreshToken, user }

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSession({ accessToken, refreshToken, role, user }) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ role, refreshToken, user })
  );
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

// Unwrap the { success, message, data } envelope, auto-refresh expired JWTs,
// and normalise errors coming back from ApiError / the Joi validate middleware.
client.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const originalRequest = err.config;

    // If 401 (token expired/invalid) and request hasn't been retried yet
    if (err.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const session = getSession();

      if (session?.refreshToken && session?.role) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${BASE_URL}/app/v1/${session.role}/refresh-token`, {
                refreshToken: session.refreshToken,
              })
              .then((res) => res.data)
              .finally(() => {
                refreshPromise = null;
              });
          }

          const refreshRes = await refreshPromise;
          const { accessToken, refreshToken: newRefreshToken } = refreshRes?.data || {};

          if (accessToken) {
            saveSession({
              accessToken,
              refreshToken: newRefreshToken || session.refreshToken,
              role: session.role,
              user: session.user,
            });
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return client(originalRequest);
          }
        } catch {
          clearSession();
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/login") &&
            !window.location.pathname.startsWith("/register")
          ) {
            window.location.href = "/login";
          }
        }
      } else {
        clearSession();
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login") &&
          !window.location.pathname.startsWith("/register")
        ) {
          window.location.href = "/login";
        }
      }
    }

    const message =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

// ---------- Auth ----------
export const authApi = {
  register: (role, payload) => client.post(`/app/v1/${role}/register`, payload),
  login: (role, payload) => client.post(`/app/v1/${role}/login`, payload),
  logout: (role) => client.post(`/app/v1/${role}/logout`),
  forgotPassword: (role, email) =>
    client.post(
      role === "customer" ? `/app/v1/customer/forgot-password` : `/app/v1/${role}/forgot-password`,
      { email }
    ),
  resetPassword: ({ token, password, role }) =>
    client.post(
      role ? `/app/v1/${role}/reset-password` : `/app/v1/auth/reset-password`,
      { token, password }
    ),
};

// ---------- Master service catalog ----------
export const servicesApi = {
  list: () => client.get("/api/v1/services"),
  create: (payload) => client.post("/api/v1/services", payload),
  remove: (id) => client.delete(`/api/v1/services/${id}`),
};

// ---------- Seller service offerings ----------
// Requires seller-service.routes.js to be mounted in app.js (see setup notes).
export const sellerServicesApi = {
  listAll: () => client.get("/api/v1/seller-services"),
  listByService: (serviceId) => client.get(`/api/v1/seller-services/service/${serviceId}`),
  listForSeller: (sellerId) => client.get(`/api/v1/seller-services/seller/${sellerId}`),
  add: (payload) => client.post("/api/v1/seller-services", payload),
  update: (serviceId, payload) => client.patch(`/api/v1/seller-services/${serviceId}`, payload),
  remove: (serviceId) => client.delete(`/api/v1/seller-services/${serviceId}`),
};

// ---------- Cart ----------
// Fires a plain DOM event whenever the cart changes so the navbar badge (or
// anything else) can refresh instantly instead of waiting for the next
// route change to happen to re-fetch it. Optionally carries a known count
// so listeners can skip an extra round trip when the caller already knows
// the new total (e.g. the Cart page itself, after loading its full list).
const CART_CHANGED_EVENT = "homecare:cart-changed";
function notifyCartChanged(knownCount) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CART_CHANGED_EVENT, { detail: { count: knownCount } })
    );
  }
}

export const cartApi = {
  list: () => client.get("/app/v1/cart"),
  // Cheap Redis-only count for UI chrome (navbar badge) — avoids the full
  // enriched list() round trip (which also joins Postgres) just to show a
  // number.
  count: () => client.get("/app/v1/cart/count"),
  // Lets a page that already fetched the full list (e.g. Cart.jsx) tell the
  // navbar the new count directly, instead of the navbar firing its own
  // redundant /cart/count request at the same moment.
  announceCount: (count) => notifyCartChanged(count),
  add: (payload) =>
    client.post("/app/v1/cart", payload).then((res) => {
      notifyCartChanged();
      return res;
    }),
  // Hot path for a quantity +/- stepper, if/when one is added here — hits
  // Redis only on the backend, no DB round trip.
  increment: (serviceId, sellerId, delta) =>
    client.patch("/app/v1/cart/increment", { serviceId, sellerId, delta }).then((res) => {
      notifyCartChanged();
      return res;
    }),
  // knownCount is optional: pass it when the caller already knows the new
  // total (Cart.jsx does, from its own local list) so the navbar can use it
  // directly instead of firing its own /cart/count request right after.
  remove: (serviceId, sellerId, knownCount) =>
    client.delete(`/app/v1/cart/${serviceId}/${sellerId}`).then((res) => {
      notifyCartChanged(knownCount);
      return res;
    }),
  CART_CHANGED_EVENT,
};

// ---------- Orders ----------
export const ordersApi = {
  create: ({ bookingDate, timeSlot }) => client.post("/api/v1/orders", { bookingDate, timeSlot }),
  list: () => client.get("/api/v1/orders"),
  get: (id) => client.get(`/api/v1/orders/${id}`),
  cancel: (id) => client.patch(`/api/v1/orders/${id}/cancel`),
  // Cancels a single line item within a combined (multi-seller/multi-item)
  // order, leaving the rest of the order untouched.
  cancelItem: (orderId, itemId) => client.patch(`/api/v1/orders/${orderId}/items/${itemId}/cancel`),
};

// ---------- Payments (Razorpay) ----------
export const paymentsApi = {
  createOrder: (orderId) => client.post(`/api/v1/payments/orders/${orderId}/create`),
  verify: (payload) => client.post("/api/v1/payments/verify", payload),
};

// The backend also confirms payment asynchronously via a Razorpay webhook,
// which can land a few seconds after the checkout modal closes (or after a
// browser-side /verify call fails on a flaky connection) even though the
// charge itself went through. Before telling the customer a payment failed,
// give the webhook a short window to land and re-check the order instead of
// trusting only the synchronous, browser-side outcome.
export async function waitForPaymentStatus(orderId, options) {
  const attempts = (options && options.attempts) || 4;
  const delayMs = (options && options.delayMs) || 1500;

  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const res = await ordersApi.get(orderId);
      if (res.data && res.data.paymentStatus === "paid") {
        return res.data;
      }
    } catch (err) {
      // Ignore and keep polling: a transient fetch error here shouldn't stop
      // us from finding out the payment actually went through.
    }
  }
  return null;
}

// ---------- Ratings ----------
// Requires ratings.routes.js to be mounted in app.js (see setup notes).
export const ratingsApi = {
  listForSeller: (sellerId) => client.get(`/api/v1/ratings/seller/${sellerId}`),
  add: (payload) => client.post("/api/v1/ratings", payload),
};

// ---------- Seller Bookings & Operations ----------
export const sellerBookingsApi = {
  list: () => client.get("/app/v1/seller/bookings"),
  updateStatus: (bookingId, status) =>
    client.patch(`/app/v1/seller/bookings/${bookingId}/status`, { status }),
};

// ---------- Seller Notifications ----------
export const sellerNotificationsApi = {
  list: () => client.get("/app/v1/seller/notifications"),
  unreadCount: () => client.get("/app/v1/seller/notifications/unread-count"),
  markRead: (id) => client.patch(`/app/v1/seller/notifications/${id}/read`),
  markAllRead: () => client.patch("/app/v1/seller/notifications/read-all"),
};

// ---------- Customer Notifications ----------
export const customerNotificationsApi = {
  list: () => client.get("/app/v1/customer/notifications"),
  unreadCount: () => client.get("/app/v1/customer/notifications/unread-count"),
  markRead: (id) => client.patch(`/app/v1/customer/notifications/${id}/read`),
  markAllRead: () => client.patch("/app/v1/customer/notifications/read-all"),
};

// ---------- AI Search ----------
export const aiSearchApi = {
  search: (query) => client.post("/api/v1/ai-search", { query }),
};

export default client;
