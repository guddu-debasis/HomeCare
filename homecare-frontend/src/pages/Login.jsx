import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { input, btnPrimary } from "../lib/ui";
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
                  onClick={() => alert("Password reset emails are handled automatically on request.")}
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

      <Footer />
    </div>
  );
}
