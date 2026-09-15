import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import SellerProfile from "./pages/SellerProfile";
import NotFound from "./pages/NotFound";

import Cart from "./pages/customer/Cart";
import Orders from "./pages/customer/Orders";
import OrderDetail from "./pages/customer/OrderDetail";

import MyServices from "./pages/seller/MyServices";
import ManageServices from "./pages/admin/ManageServices";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
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
            </main>
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
