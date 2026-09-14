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

// Unwrap the { success, message, data } envelope and normalise errors
// coming back from ApiError / the Joi validate middleware.
client.interceptors.response.use(
  (res) => res.data,
  (err) => {
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
  listForSeller: (sellerId) => client.get(`/api/v1/seller-services/seller/${sellerId}`),
  add: (payload) => client.post("/api/v1/seller-services", payload),
  remove: (serviceId) => client.delete(`/api/v1/seller-services/${serviceId}`),
};

// ---------- Cart ----------
export const cartApi = {
  list: () => client.get("/app/v1/cart"),
  add: (payload) => client.post("/app/v1/cart", payload),
  remove: (cartItemId) => client.delete(`/app/v1/cart/${cartItemId}`),
};

// ---------- Orders ----------
export const ordersApi = {
  create: (bookingDate) => client.post("/api/v1/orders", { bookingDate }),
  list: () => client.get("/api/v1/orders"),
  get: (id) => client.get(`/api/v1/orders/${id}`),
};

// ---------- Ratings ----------
// Requires ratings.routes.js to be mounted in app.js (see setup notes).
export const ratingsApi = {
  listForSeller: (sellerId) => client.get(`/api/v1/ratings/seller/${sellerId}`),
  add: (payload) => client.post("/api/v1/ratings", payload),
};

export default client;
