import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authApi } from "../lib/api";
import { input, btnPrimary, btnSecondary } from "../lib/ui";
import Modal from "../components/Modal";
import Footer from "../components/Footer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ROLES = [
  { key: "customer", title: "Customer", icon: "👤" },
  { key: "seller", title: "Provider", icon: "🛠️" },
  { key: "admin", title: "Admin", icon: "⚡" },
];

export default function Login() {
  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotRole, setForgotRole] = useState("customer");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectFor = (r) => {
    if (r === "seller") return "/seller/services";
    if (r === "admin") return "/admin/services";
    return "/";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      showError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      const payload = role === "customer" ? { ...form, role: "customer" } : form;
      await login(role, payload);
      showSuccess(`Welcome back! Signed in as ${role}.`);
      const dest = location.state?.from?.pathname || redirectFor(role);
      navigate(dest, { replace: true });
    } catch (err) {
      showError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(form.email || "");
    setForgotRole(role);
    setForgotSent(false);
    setIsForgotModalOpen(true);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showError("Please enter your registered email address.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotRole, forgotEmail.trim());
      showSuccess(res.message || "Password reset link sent to your email!");
      setForgotSent(true);
    } catch (err) {
      showError(err.message || "Failed to send reset link. Please check the email and try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-md px-6 py-16 w-full my-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-2xl shadow-lg">
            H
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-sm text-slate-400">
            Sign in to Hearth to manage your bookings or service offerings
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="flex rounded-2xl border border-slate-800 bg-slate-900/80 p-1.5 backdrop-blur-md">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                role === r.key
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>{r.icon}</span>
              <span>{r.title}</span>
            </button>
          ))}
        </div>

        {/* Auth Form */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                className={input}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-[11px] font-semibold text-amber-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className={`${input} pr-10`}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-3 text-base`}>
              {loading ? "Signing in..." : `Sign In as ${role.toUpperCase()}`}
            </button>
          </form>

          {/* Google OAuth — not available for admin */}
          {role !== "admin" && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <a
                href={`${API_URL}/app/v1/${role}/auth/google`}
                className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-all hover:border-slate-600"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google as {role === "customer" ? "Customer" : "Provider"}
              </a>
            </>
          )}

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Don't have a Hearth account yet?{" "}
            <Link to="/register" className="font-bold text-amber-400 hover:underline">
              Create an account →
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Password"
      >
        {forgotSent ? (
          <div className="space-y-4 text-center py-2">
            <div className="text-4xl">📬</div>
            <h4 className="font-bold text-lg text-white">Reset Link Sent!</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              We've dispatched an email to <strong className="text-amber-400">{forgotEmail}</strong> with a secure link to reset your password.
            </p>
            <p className="text-[11px] text-slate-400">
              The link will expire in 15 minutes. Check your spam folder if it doesn't arrive shortly.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className={`${btnPrimary} w-full py-2.5`}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <p className="text-xs text-slate-400">
              Select your account type and enter your email address. We'll send you a link to reset your password.
            </p>

            {/* Role selector inside modal */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Account Type
              </label>
              <div className="flex gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setForgotRole(r.key)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      forgotRole === r.key
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Registered Email
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                className={input}
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className={btnPrimary}
              >
                {forgotLoading ? "Sending Link..." : "Send Reset Link"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Footer />
    </div>
  );
}
