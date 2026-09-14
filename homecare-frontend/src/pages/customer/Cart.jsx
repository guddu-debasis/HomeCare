import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cartApi, ordersApi } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { card, input, label, btnAccent, errorText } from "../../lib/ui";
import DeleteButton from "../../components/DeleteButton";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [booking, setBooking] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    cartApi
      .list()
      .then((res) => setItems(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const total = items.reduce(
    (sum, i) => sum + Number(i.basePrice) * i.quantity,
    0
  );

  const remove = async (cartId) => {
    setError("");
    try {
      await cartApi.remove(cartId);
      setItems((prev) => prev.filter((i) => i.cartId !== cartId));
    } catch (err) {
      setError(err.message);
    }
  };

  const checkout = async (e) => {
    e.preventDefault();
    setError("");
    setBooking(true);
    try {
      const order = await ordersApi.create(bookingDate);
      navigate(`/orders/${order.data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-ink">Your cart</h1>

      {loading && <p className="mt-6 text-sm text-ink-soft">Loading…</p>}
      {error && <p className={`${errorText} mt-6`}>{error}</p>}

      {!loading && items.length === 0 && !error && (
        <p className="mt-6 text-sm text-ink-soft">
          Your cart is empty. Look up a provider from the home page and add a
          service to get started.
        </p>
      )}

      {items.length > 0 && (
        <>
          <ul className="mt-6 space-y-3">
            {items.map((item) => (
              <li key={item.cartId} className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0">
                  <p className="break-words font-medium text-ink">{item.serviceName}</p>
                  <p className="text-sm text-ink-soft">
                    with {item.sellerName} · qty {item.quantity}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="text-sm font-medium text-pine">
                    {formatMoney(item.basePrice * item.quantity)}
                  </span>
                  <DeleteButton onClick={() => remove(item.cartId)} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-ink-soft">Estimated total</span>
            <span className="font-display text-xl text-ink">{formatMoney(total)}</span>
          </div>

          <form onSubmit={checkout} className={`${card} mt-6`}>
            <label className={label}>Booking date</label>
            <input
              type="date"
              required
              className={input}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
            <button disabled={booking} className={`${btnAccent} mt-4 w-full`}>
              {booking ? "Booking…" : "Confirm booking"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
