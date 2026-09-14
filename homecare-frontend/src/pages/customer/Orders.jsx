import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ordersApi } from "../../lib/api";
import { formatMoney, formatDate } from "../../lib/format";
import { card, errorText } from "../../lib/ui";
import StatusBadge from "../../components/StatusBadge";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    ordersApi
      .list()
      .then((res) => setOrders(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-ink">Your bookings</h1>

      {loading && <p className="mt-6 text-sm text-ink-soft">Loading…</p>}
      {error && <p className={`${errorText} mt-6`}>{error}</p>}

      {!loading && orders.length === 0 && !error && (
        <p className="mt-6 text-sm text-ink-soft">No bookings yet.</p>
      )}

      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className={`${card} flex flex-col gap-3 transition-colors hover:border-pine sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">Booking #{o.id}</p>
                <p className="text-sm text-ink-soft">{formatDate(o.bookingDate)}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <StatusBadge status={o.status} />
                <span className="font-medium text-pine">{formatMoney(o.totalAmount)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
