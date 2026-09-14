import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { input, btnPrimary } from "../lib/ui";
import Footer from "../components/Footer";

const ROLES = [
  { key: "customer", title: "Customer", icon: "👤", blurb: "Book verified local home services." },
  { key: "seller", title: "Provider", icon: "🛠️", blurb: "Offer & price your service catalog." },
  { key: "admin", title: "Admin", icon: "⚡", blurb: "Manage system master catalog." },
];

const initialForms = {
  customer: { username: "", email: "", password: "", dob: "" },
  seller: { username: "", email: "", password: "", dob: "", phNo: "" },
  admin: { username: "", email: "", password: "", dob: "", phNo: "" },
};

export default function Register() {
  const [role, setRole] = useState("customer");
  const [forms, setForms] = useState(initialForms);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { showSuccess, showError } = useToast();

  const form = forms[role];
  const setField = (key, value) =>
    setForms((f) => ({ ...f, [role]: { ...f[role], [key]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(role, form);
      showSuccess(`Account created successfully for ${role}!`);
      setSuccess(true);
    } catch (err) {
      showError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        <div className="mx-auto max-w-md px-6 py-16 w-full my-auto text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-extrabold text-3xl mx-auto">
            ✓
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Account Created!</h1>
          <p className="text-sm text-slate-400">
            Your <strong className="text-emerald-400 capitalize">{role}</strong> account has been set up successfully. Sign in to start using Hearth.
          </p>
          <div className="pt-2">
            <Link to="/login" className={`${btnPrimary} px-8 py-3 text-base`}>
              Go to Sign In →
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-md px-6 py-12 w-full my-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-2xl shadow-lg">
            H
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Create Your Account</h1>
          <p className="text-sm text-slate-400">
            {ROLES.find((r) => r.key === role)?.blurb}
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

        {/* Auth Form Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Username
              </label>
              <input
                required
                minLength={3}
                pattern={role === "customer" ? "[a-zA-Z0-9]+" : undefined}
                title="Letters and numbers only, no spaces"
                placeholder="Choose a username"
                className={input}
                value={form.username}
                onChange={(e) => setField("username", e.target.value)}
              />
              {role === "customer" && (
                <p className="mt-1 text-[11px] text-slate-500">Letters and numbers only, no spaces.</p>
              )}
            </div>

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
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className={`${input} pr-10`}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
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

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Date of Birth {role !== "customer" && "(Optional)"}
              </label>
              <input
                type="date"
                required={role === "customer"}
                className={input}
                value={form.dob}
                onChange={(e) => setField("dob", e.target.value)}
              />
            </div>

            {role !== "customer" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className={input}
                  value={form.phNo}
                  onChange={(e) => setField("phNo", e.target.value)}
                />
              </div>
            )}

            <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-3 text-base`}>
              {loading ? "Creating Account..." : `Register as ${role.toUpperCase()}`}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-amber-400 hover:underline">
              Sign In →
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
