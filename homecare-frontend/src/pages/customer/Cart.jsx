import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cartApi, ordersApi, paymentsApi, waitForPaymentStatus } from "../../lib/api";
import { loadRazorpayScript } from "../../lib/loadRazorpay";
import { formatMoney } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { btnPrimary, btnSecondary, input } from "../../lib/ui";
import Footer from "../../components/Footer";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("Morning (08:00 - 12:00)");
  const [ordering, setOrdering] = useState(false);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const loadCart = () => {
    setLoading(true);
    cartApi
      .list()
      .then((res) => {
        const loadedItems = res.data || [];
        setItems(loadedItems);
        // Let the navbar badge know the count directly from this response,
        // instead of it firing its own separate /cart/count request at the
        // same moment this page is already loading the full list.
        cartApi.announceCount(loadedItems.length);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCart();
    // Default booking date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split("T")[0]);
    // Prefetch Razorpay's checkout.js in the background while the customer
    // is still reviewing their cart, so clicking "Confirm & Pay" doesn't
    // have to wait on it. Fire-and-forget; handleCheckout re-checks it.
    loadRazorpayScript();
  }, []);

  const removeItem = async (item) => {
    // Optimistic removal: drop it from the visible list immediately so the
    // click feels instant, then confirm with the backend in the background.
    // Roll back (and re-show the error) if the request actually fails.
    const previousItems = items;
    const nextItems = items.filter((i) => i.id !== item.id);
    setItems(nextItems);
    try {
      // Passing nextItems.length lets cartApi.remove announce the new count
      // to the navbar directly, instead of a second /cart/count request.
      await cartApi.remove(item.serviceId, item.sellerId, nextItems.length);
      showSuccess("Item removed from cart.");
    } catch (err) {
      setItems(previousItems);
      showError(err.message || "Failed to remove item.");
    }
  };

  // +/- stepper. Optimistic and non-blocking on purpose — the backend's
  // /cart/increment endpoint is Redis-only (no DB round trip), specifically
  // so rapid clicking here doesn't lag. Reaching 0 removes the line, same
  // as the backend does.
  const changeQuantity = (item, delta) => {
    const previousItems = items;
    const nextQuantity = (item.quantity || 1) + delta;
    const nextItems =
      nextQuantity <= 0
        ? items.filter((i) => i.id !== item.id)
        : items.map((i) => (i.id === item.id ? { ...i, quantity: nextQuantity } : i));

    setItems(nextItems);
    cartApi.increment(item.serviceId, item.sellerId, delta).catch((err) => {
      setItems(previousItems);
      showError(err.message || "Failed to update quantity.");
    });
  };

  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.price || item.basePrice || 0) * (item.quantity || 1),
    0
  );
  // NOTE: The backend computes its own total from cart prices with no service fee.
  // Keep UI total = backend total so the Razorpay charge matches what's displayed.
  const total = subtotal;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!bookingDate) {
      showError("Please select a booking date.");
      return;
    }

    setOrdering(true);
    try {
      // Backend expects { bookingDate }
      const res = await ordersApi.create(bookingDate);
      const bookingId = res.data.id;

      let rpRes;
      try {
        rpRes = await paymentsApi.createOrder(bookingId);
      } catch (err) {
        showError(err.message || "Booking placed, but starting payment failed. Pay from your booking page.");
        navigate(`/orders/${bookingId}`);
        return;
      }

      // Fetched on demand — not preloaded on every page (see index.html) —
      // so kick this off in parallel with the payment-order creation above
      // rather than waiting for it first.
      const razorpayReady = await loadRazorpayScript();
      if (!razorpayReady || !window.Razorpay) {
        showError("Payment gateway failed to load. You can pay from your booking page.");
        navigate(`/orders/${bookingId}`);
        return;
      }

      const { razorpayOrderId, amount, currency, keyId } = rpRes.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "Hearth",
        description: `Booking #${bookingId}`,
        order_id: razorpayOrderId,
        theme: { color: "#f59e0b" },
        handler: async (response) => {
          try {
            await paymentsApi.verify({
              orderId: bookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            showSuccess("Payment successful! Your booking is confirmed.");
          } catch (err) {
            // The browser-side verify call failed (e.g. a dropped connection
            // right after a successful charge). The money may still have been
            // captured and the server-side webhook will mark the order paid a
            // little after this — check for that before alarming the customer.
            const settled = await waitForPaymentStatus(bookingId);
            if (settled) {
              showSuccess("Payment successful! Your booking is confirmed.");
            } else {
              showError(err.message || "Payment could not be verified. Contact support if you were charged.");
            }
          } finally {
            navigate(`/orders/${bookingId}`);
          }
        },
        modal: {
          ondismiss: async () => {
            // Closing the checkout modal doesn't necessarily mean the payment
            // failed — e.g. a UPI app confirmed the payment but the customer
            // closed this tab before Razorpay's handler fired. Give the webhook
            // a moment to confirm before reporting a failure.
            const settled = await waitForPaymentStatus(bookingId);
            if (settled) {
              showSuccess("Payment successful! Your booking is confirmed.");
            } else {
              showError("Payment wasn't completed. You can pay anytime from your booking page.");
            }
            navigate(`/orders/${bookingId}`);
          },
        },
      });

      rzp.on("payment.failed", async () => {
        const settled = await waitForPaymentStatus(bookingId);
        if (settled) {
          showSuccess("Payment successful! Your booking is confirmed.");
        } else {
          showError("Payment failed. You can try again from your booking page.");
        }
        navigate(`/orders/${bookingId}`);
      });

      rzp.open();
    } catch (err) {
      showError(err.message || "Failed to place order.");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-7xl px-6 py-12 w-full space-y-8">
        {/* Page Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Checkout</span>
            <h1 className="font-display text-3xl font-bold text-white mt-1">Your Booking Cart</h1>
          </div>
          <Link to="/" className={btnSecondary}>
            ← Browse More Services
          </Link>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="h-24 rounded-2xl bg-slate-900/60 animate-pulse" />
            <div className="h-24 rounded-2xl bg-slate-900/60 animate-pulse" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4 max-w-2xl mx-auto">
            <div className="text-5xl">🛒</div>
            <h2 className="font-display text-2xl font-bold text-white">Your Cart is Empty</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              You haven't added any home services to your cart yet. Explore our service catalog or look up your provider ID to start booking.
            </p>
            <div className="pt-4">
              <Link to="/" className={btnPrimary}>
                Explore Catalog →
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Cart Items List */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-4">
                {items.map((item) => {
                  const itemPrice = Number(item.price || item.basePrice || 0);
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-amber-400">
                            Service #{item.serviceId}
                          </span>
                          {item.sellerId && (
                            <Link
                              to={`/sellers/${item.sellerId}`}
                              className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 hover:text-white"
                            >
                              Provider #{item.sellerId}
                            </Link>
                          )}
                        </div>
                        <h3 className="font-display text-lg font-bold text-white">
                          {item.serviceName || `Service #${item.serviceId}`}
                        </h3>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-slate-400">Qty</span>
                          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950">
                            <button
                              type="button"
                              onClick={() => changeQuantity(item, -1)}
                              className="px-2.5 py-1 text-slate-400 hover:text-amber-400 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-slate-100">
                              {item.quantity || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeQuantity(item, 1)}
                              className="px-2.5 py-1 text-slate-400 hover:text-amber-400 transition-colors"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <span className="text-lg font-extrabold text-amber-400">
                          {formatMoney(itemPrice * (item.quantity || 1))}
                        </span>

                        <button
                          onClick={() => removeItem(item)}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
                          title="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Schedule Booking Card */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 font-bold text-lg">
                    📅
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-white">Select Booking Schedule</h3>
                    <p className="text-xs text-slate-400">Choose your preferred date and arrival time window</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Booking Date
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className={input}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Time Slot Window
                    </label>
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className={input}
                    >
                      <option value="Morning (08:00 - 12:00)">Morning (08:00 - 12:00)</option>
                      <option value="Afternoon (12:00 - 16:00)">Afternoon (12:00 - 16:00)</option>
                      <option value="Evening (16:00 - 20:00)">Evening (16:00 - 20:00)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Checkout Card */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 backdrop-blur-xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold font-display text-white border-b border-slate-800 pb-4">
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal ({items.length} items)</span>
                    <span className="font-semibold text-slate-200">{formatMoney(subtotal)}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="text-base font-bold text-white">Total Amount</span>
                    <span className="text-2xl font-extrabold text-amber-400">{formatMoney(total)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Hearth Booking Protection Included
                  </div>
                  <p className="text-[11px] text-emerald-400/80">
                    Free cancellations up to 24h before scheduled arrival. 100% money-back guarantee.
                  </p>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={ordering}
                  className={`${btnPrimary} w-full py-3 text-base`}
                >
                  {ordering ? "Starting payment..." : "Confirm & Pay →"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
