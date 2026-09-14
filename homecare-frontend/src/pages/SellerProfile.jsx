import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { sellerServicesApi, ratingsApi, cartApi } from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { card, btnAccent, btnGhost, input, label, errorText } from "../lib/ui";
import Stars from "../components/Stars";

export default function SellerProfile() {
  const { sellerId } = useParams();
  const { role } = useAuth();
  const [offerings, setOfferings] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState(null);
  const [notice, setNotice] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      sellerServicesApi.listForSeller(sellerId).catch(() => ({ data: [] })),
      ratingsApi.listForSeller(sellerId).catch(() => ({ data: [] })),
    ])
      .then(([offeringsRes, ratingsRes]) => {
        setOfferings(offeringsRes.data || []);
        setRatings(ratingsRes.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [sellerId]);

  const avgRating = ratings.length
    ? ratings.reduce((sum, r) => sum + r.ratingScore, 0) / ratings.length
    : 0;

  const addToCart = async (serviceId) => {
    setAddingId(serviceId);
    setNotice("");
    setError("");
    try {
      await cartApi.add({ serviceId, sellerId: Number(sellerId), quantity: 1 });
      setNotice("Added to cart.");
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint">Provider</p>
          <h1 className="font-display text-3xl text-ink">#{sellerId}</h1>
        </div>
        {ratings.length > 0 && (
          <div className="flex items-center gap-2">
            <Stars value={avgRating} size="text-lg" />
            <span className="text-sm text-ink-soft">
              {avgRating.toFixed(1)} ({ratings.length} review{ratings.length !== 1 ? "s" : ""})
            </span>
          </div>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-ink-soft">Loading…</p>}
      {error && <p className={`${errorText} mt-6`}>{error}</p>}
      {notice && (
        <p className="mt-6 rounded-md bg-pine-light px-3 py-2 text-sm text-pine-dark">
          {notice}
        </p>
      )}

      {!loading && (
        <>
          <section className="mt-8">
            <h2 className="font-display text-xl text-ink">What they offer</h2>
            {offerings.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">
                This provider hasn't listed any services yet.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {offerings.map((o) => (
                  <div key={o.id} className={card}>
                    <h3 className="font-display text-lg text-ink">{o.serviceName}</h3>
                    {o.description && (
                      <p className="mt-1 text-sm text-ink-soft">{o.description}</p>
                    )}
                    <p className="mt-3 text-sm font-medium text-pine">
                      {formatMoney(o.customPrice ?? o.basePrice)}
                      {o.customPrice && (
                        <span className="ml-2 text-xs text-ink-faint line-through">
                          {formatMoney(o.basePrice)}
                        </span>
                      )}
                    </p>
                    {role === "customer" && (
                      <button
                        onClick={() => addToCart(o.serviceId)}
                        disabled={addingId === o.serviceId}
                        className={`${btnAccent} mt-3 w-full`}
                      >
                        {addingId === o.serviceId ? "Adding…" : "Add to cart"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="font-display text-xl text-ink">Reviews</h2>
            {ratings.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">No reviews yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {ratings.map((r) => (
                  <li key={r.id} className={card}>
                    <div className="flex items-center justify-between">
                      <Stars value={r.ratingScore} />
                      <span className="text-xs text-ink-faint">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm text-ink-soft">{r.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
