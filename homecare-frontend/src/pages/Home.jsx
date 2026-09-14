import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { servicesApi } from "../lib/api";
import { formatMoney } from "../lib/format";
import { card, input, btnAccent, btnGhost } from "../lib/ui";

export default function Home() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sellerId, setSellerId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    servicesApi
      .list()
      .then((res) => setServices(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const goToSeller = (e) => {
    e.preventDefault();
    if (sellerId.trim()) navigate(`/sellers/${sellerId.trim()}`);
  };

  return (
    <div>
      <section className="border-b border-line bg-pine-light">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="max-w-xl font-display text-5xl leading-[1.1] text-pine-dark">
            Care for your home, arranged by people who know your street.
          </h1>
          <p className="mt-4 max-w-md text-ink-soft">
            Browse the services we cover, then book a trusted local provider
            for the day that works for you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">
            Services on Hearth
          </h2>
        </div>

        {loading && <p className="mt-6 text-sm text-ink-soft">Loading services…</p>}
        {error && <p className="mt-6 text-sm text-brick">{error}</p>}

        {!loading && !error && services.length === 0 && (
          <p className="mt-6 text-sm text-ink-soft">
            No services in the catalog yet. Check back soon.
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.id} className={card}>
              <h3 className="font-display text-lg text-ink">{s.serviceName}</h3>
              {s.description && (
                <p className="mt-1 text-sm text-ink-soft">{s.description}</p>
              )}
              <p className="mt-3 text-sm font-medium text-pine">
                From {formatMoney(s.basePrice)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="font-display text-2xl text-ink">
            Booking with a specific provider?
          </h2>
          <p className="mt-1 max-w-lg text-sm text-ink-soft">
            If a provider has shared their ID with you, look them up here to
            see what they offer, their pricing, and reviews from other
            customers.
          </p>
          <form onSubmit={goToSeller} className="mt-4 flex max-w-sm gap-2">
            <input
              className={input}
              placeholder="Provider ID"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            />
            <button className={btnAccent}>View</button>
          </form>
        </div>
      </section>
    </div>
  );
}
