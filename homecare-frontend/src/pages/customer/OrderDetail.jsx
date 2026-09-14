import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ordersApi, ratingsApi } from "../../lib/api";
import { formatMoney, formatDate } from "../../lib/format";
import { card, input, label, btnAccent, errorText } from "../../lib/ui";
import StatusBadge from "../../components/StatusBadge";

function RateSeller({ orderId, sellerId }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await ratingsApi.add({
        bookingId: Number(orderId),
        sellerId,
        ratingScore: Number(score),
        comment,
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return <p className="text-sm text-pine">Thanks for rating provider #{sellerId}.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
      {error && <p className={`${errorText} w-full`}>{error}</p>}
      <div>
        <label className={label}>Rating</label>
        <select
          className={input}
          value={score}
          onChange={(e) => setScore(e.target.value)}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n !== 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[10rem]">
        <label className={label}>Comment (optional)</label>
        <input
          className={input}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button disabled={saving} className={btnAccent}>
        {saving ? "Saving…" : "Submit rating"}
      </button>
    </form>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    ordersApi
      .get(id)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-ink">Booking #{id}</h1>

      {loading && <p className="mt-6 text-sm text-ink-soft">Loading…</p>}
      {error && <p className={`${errorText} mt-6`}>{error}</p>}

      {order && (
        <>
          <div className={`${card} mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="text-sm text-ink-soft">Booking date</p>
              <p className="font-medium text-ink">{formatDate(order.bookingDate)}</p>
            </div>
            <div className="sm:text-right">
              <StatusBadge status={order.status} />
              <p className="mt-1 text-xs text-ink-faint">
                Payment: <StatusBadge status={order.paymentStatus} />
              </p>
            </div>
          </div>

          <h2 className="mt-8 font-display text-xl text-ink">Items</h2>
          <ul className="mt-4 space-y-3">
            {(order.items || []).map((item) => (
              <li key={item.id} className={card}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-words text-sm text-ink">
                    Service #{item.serviceId} · Provider #{item.sellerId} · qty {item.quantity}
                  </p>
                  <span className="font-medium text-pine">
                    {formatMoney(item.price * item.quantity)}
                  </span>
                </div>
                {order.status === "completed" && (
                  <RateSeller orderId={order.id} sellerId={item.sellerId} />
                )}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-ink-soft">Total</span>
            <span className="font-display text-xl text-ink">
              {formatMoney(order.totalAmount)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
