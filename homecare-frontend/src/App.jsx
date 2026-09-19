import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";

// Home is the most common landing page, so it stays in the main bundle —
// everything else is fetched on demand. A visitor just browsing services
// should never have to download the admin dashboard, the seller dashboard,
// or the checkout flow's code before they can see anything.
import Home from "./pages/Home";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const Cart = lazy(() => import("./pages/customer/Cart"));
const Orders = lazy(() => import("./pages/customer/Orders"));
const OrderDetail = lazy(() => import("./pages/customer/OrderDetail"));

const MyServices = lazy(() => import("./pages/seller/MyServices"));
const ManageServices = lazy(() => import("./pages/admin/ManageServices"));

// Small, deliberately boring fallback — shown only for the brief moment a
// lazy chunk is downloading (typically well under what a spinner needs to
// justify itself once the chunk is cached by the browser).
function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <ScrollToTop />
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
            <Navbar />
            <main className="flex-1">
              <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/sellers/:sellerId" element={<SellerProfile />} />

                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <Cart />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <Orders />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <ProtectedRoute roles={["customer"]}>
                      <OrderDetail />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/seller/services"
                  element={
                    <ProtectedRoute roles={["seller"]}>
                      <MyServices />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/services"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <ManageServices />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </main>
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
