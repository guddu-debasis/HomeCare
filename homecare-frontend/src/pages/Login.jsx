import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { input, label, btnPrimary, errorText, card } from "../lib/ui";

const ROLES = [
  { key: "customer", title: "Customer" },
  { key: "seller", title: "Provider" },
  { key: "admin", title: "Admin" },
];

export default function Login() {
  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectFor = (r) => {
    if (r === "seller") return "/seller/services";
    if (r === "admin") return "/admin/services";
    return "/";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload =
        role === "customer" ? { ...form, role: "customer" } : form;
      await login(role, payload);
      const dest = location.state?.from?.pathname || redirectFor(role);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-display text-3xl text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Log in to book care or manage your listings.
      </p>

      <div className="mt-6 flex gap-1 rounded-md bg-pine-light p-1">
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRole(r.key)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              role === r.key
                ? "bg-white text-pine shadow-sm"
                : "text-pine-dark/70 hover:text-pine"
            }`}
          >
            {r.title}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={`${card} mt-4 space-y-4`}>
        {error && <p className={errorText}>{error}</p>}

        <div>
          <label className={label}>Email</label>
          <input
            type="email"
            required
            className={input}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div>
          <label className={label}>Password</label>
          <input
            type="password"
            required
            minLength={8}
            className={input}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button disabled={loading} className={`${btnPrimary} w-full`}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link to="/register" className="font-medium text-pine hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
