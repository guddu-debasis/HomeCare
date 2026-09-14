import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { input, label, btnPrimary, errorText, card } from "../lib/ui";

const ROLES = [
  { key: "customer", title: "Customer", blurb: "Book home-care services." },
  { key: "seller", title: "Provider", blurb: "List and offer your services." },
  { key: "admin", title: "Admin", blurb: "Manage the service catalog." },
];

const initialForms = {
  customer: { username: "", email: "", password: "", dob: "" },
  seller: { username: "", email: "", password: "", dob: "", phNo: "" },
  admin: { username: "", email: "", password: "", dob: "", phNo: "" },
};

export default function Register() {
  const [role, setRole] = useState("customer");
  const [forms, setForms] = useState(initialForms);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const form = forms[role];
  const setField = (key, value) =>
    setForms((f) => ({ ...f, [role]: { ...f[role], [key]: value } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(role, form);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <h1 className="font-display text-3xl text-ink">You're all set</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Your {role} account has been created. Log in to continue.
        </p>
        <Link
          to="/login"
          className={`${btnPrimary} mt-6 inline-flex`}
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="font-display text-3xl text-ink">Create an account</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {ROLES.find((r) => r.key === role).blurb}
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

        {role === "customer" ? (
          <div>
            <label className={label}>Username</label>
            <input
              required
              minLength={3}
              pattern="[a-zA-Z0-9]+"
              title="Letters and numbers only, no spaces"
              className={input}
              value={form.username}
              onChange={(e) => setField("username", e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-faint">
              Letters and numbers only, no spaces.
            </p>
          </div>
        ) : (
          <div>
            <label className={label}>Username</label>
            <input
              required
              minLength={3}
              className={input}
              value={form.username}
              onChange={(e) => setField("username", e.target.value)}
            />
          </div>
        )}

        <div>
          <label className={label}>Email</label>
          <input
            type="email"
            required
            className={input}
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
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
            onChange={(e) => setField("password", e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-faint">8 characters minimum.</p>
        </div>

        {role === "customer" ? (
          <div>
            <label className={label}>Date of birth</label>
            <input
              type="date"
              required
              className={input}
              value={form.dob}
              onChange={(e) => setField("dob", e.target.value)}
            />
          </div>
        ) : (
          <>
            <div>
              <label className={label}>Date of birth (optional)</label>
              <input
                type="date"
                className={input}
                value={form.dob}
                onChange={(e) => setField("dob", e.target.value)}
              />
            </div>
            <div>
              <label className={label}>Phone number (optional)</label>
              <input
                className={input}
                value={form.phNo}
                onChange={(e) => setField("phNo", e.target.value)}
              />
            </div>
          </>
        )}

        <button disabled={loading} className={`${btnPrimary} w-full`}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-pine hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
