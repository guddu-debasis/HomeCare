import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { saveSession } from "../lib/api";

const redirectFor = (role) => {
  if (role === "seller") return "/seller/services";
  if (role === "admin") return "/admin/services";
  return "/";
};

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setSessionDirectly } = useAuth();
  const { showSuccess, showError } = useToast();
  const hasRun = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode/dev double-invoke running this twice.
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");

    if (error) {
      showError("Google sign-in failed. Please try again or use your email and password.");
      navigate("/login", { replace: true });
      return;
    }

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const role = params.get("role");
    const userRaw = params.get("user");

    if (!accessToken || !refreshToken || !role || !userRaw) {
      showError("Google sign-in didn't complete correctly. Please try again.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(userRaw);

      // Persist to localStorage (what lib/api.js's request interceptor reads)...
      saveSession({ accessToken, refreshToken, role, user });
      // ...and hydrate the in-memory AuthContext immediately so the app
      // doesn't need a reload to pick up the new session.
      setSessionDirectly({ role, refreshToken, user });

      showSuccess(`Welcome, ${user.username || user.name || "there"}!`);
      navigate(redirectFor(role), { replace: true });
    } catch {
      showError("Something went wrong finishing sign-in. Please try again.");
      navigate("/login", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-300">
      <div className="h-10 w-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      <p className="text-sm">Finishing sign-in with Google&hellip;</p>
    </div>
  );
}
