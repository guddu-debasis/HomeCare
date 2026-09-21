import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { aiSearchApi, cartApi } from "../lib/api";
import { formatMoney } from "../lib/format";
import { btnPrimary } from "../lib/ui";

// Every field in a result except `reason` comes straight from Postgres —
// the backend re-validates every id the model returns against the real
// candidate list before this component ever sees it (see
// ai-search.service.js). This component never has to worry about trusting
// AI-generated price/name data because it's structurally impossible for
// any to reach it.
export default function AiSearchPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null = no search run yet
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState(null);

  const { isAuthenticated, role } = useAuth();
  const { showSuccess, showError } = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (!isAuthenticated || role !== "customer") {
      showError("Log in as a customer to use AI search.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await aiSearchApi.search(query.trim());
      setResults(res.data?.results || []);
    } catch (err) {
      setError(err.message || "Search failed — try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (result) => {
    setAddingId(result.sellerServiceId);
    try {
      await cartApi.add({
        serviceId: result.serviceId,
        sellerId: result.sellerId,
        quantity: 1,
      });
      showSuccess(`Added ${result.serviceName} with ${result.sellerName} to your cart.`);
    } catch (err) {
      showError(err.message || "Failed to add to cart.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section className="border-b border-slate-800 bg-slate-900/40 py-10">
      <div className="mx-auto max-w-4xl px-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg leading-none">✨</span>
          <h2 className="font-display text-xl font-bold text-white">
            Ask AI to find the best match
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Describe what you need — "cheapest AC repair" or "highest rated
          plumber for a leak" — and we'll rank real, approved listings for
          you.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. cost-optimized deep cleaning with a high rating"
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          <button type="submit" disabled={loading} className={`${btnPrimary} px-6`}>
            {loading ? "Thinking…" : "Ask AI"}
          </button>
        </form>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {results && results.length === 0 && !loading && !error && (
          <p className="text-xs text-slate-500">
            No matching approved listings found for that — try describing it differently.
          </p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-3 pt-1">
            {results.map((r, idx) => (
              <div
                key={r.sellerServiceId}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">
                      {r.serviceName} — {r.sellerName}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{r.reason}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span className="text-amber-400 font-semibold">{formatMoney(r.price)}</span>
                      {r.ratingCount > 0 && (
                        <span>
                          ★ {Number(r.avgRating).toFixed(1)} ({r.ratingCount})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={addingId === r.sellerServiceId}
                  onClick={() => handleAdd(r)}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-400 transition-colors disabled:opacity-50 shrink-0"
                >
                  {addingId === r.sellerServiceId ? "Adding…" : "Add to cart"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
