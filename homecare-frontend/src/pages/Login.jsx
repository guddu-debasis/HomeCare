import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authApi } from "../lib/api";
import { input, btnPrimary, btnSecondary } from "../lib/ui";
import Modal from "../components/Modal";
import Footer from "../components/Footer";

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
