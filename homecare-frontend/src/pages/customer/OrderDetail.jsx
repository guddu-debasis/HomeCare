import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ordersApi, ratingsApi, paymentsApi, waitForPaymentStatus } from "../../lib/api";
import { formatMoney, formatDate } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { btnPrimary, btnSecondary, btnDanger, input } from "../../lib/ui";
import StatusBadge from "../../components/StatusBadge";
import Stars from "../../components/Stars";
import Footer from "../../components/Footer";

function RateSellerInline({ orderId, sellerId }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const { showSuccess, showError } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ratingsApi.add({
        bookingId: Number(orderId),
        sellerId,
        ratingScore: Number(score),
        comment: comment.trim(),
      });
      setDone(true);
      showSuccess(`Rating submitted for Provider #${sellerId}!`);
    } catch (err) {
      showError(err.message || "Failed to submit rating.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Thank you! Your rating for Provider #{sellerId} has been recorded.</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Rate Provider #{sellerId}</h4>
      <div className="flex items-center gap-3">
        <Stars value={score} onChange={setScore} size="text-xl" />
        <span className="text-xs font-bold text-slate-300">{score} Stars</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Leave a comment about the service..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={`${input} text-xs py-2`}
        />
        <button disabled={saving} className={`${btnPrimary} py-2 text-xs whitespace-nowrap`}>
          {saving ? "Submitting..." : "Submit Rating"}
        </button>
      </div>
    </form>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingItemId, setCancellingItemId] = useState(null);
  const [confirmCancelItemId, setConfirmCancelItemId] = useState(null);
  const [paying, setPaying] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    ordersApi
      .get(id)
      .then((res) => setOrder(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancelBooking = async () => {
    setCancelling(true);
    try {
      await ordersApi.cancel(id);
      showSuccess(`Booking #${id} has been cancelled successfully.`);
      setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      setShowCancelModal(false);
    } catch (err) {
      showError(err.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  // Cancels just one line item within this (possibly combined) order —
  // everything else in the order is left exactly as it was.
  const handleCancelItem = async (itemId) => {
    setCancellingItemId(itemId);
    try {
      const res = await ordersApi.cancelItem(id, itemId);
      showSuccess("That item has been cancelled.");
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: res.data?.status ?? prev.status,
          paymentStatus: res.data?.paymentStatus ?? prev.paymentStatus,
          items: (prev.items || []).map((it) =>
            it.id === itemId ? { ...it, status: "cancelled" } : it
          ),
        };
      });
      setConfirmCancelItemId(null);
    } catch (err) {
      showError(err.message || "Failed to cancel that item.");
    } finally {
      setCancellingItemId(null);
    }
  };

  const handlePayNow = async () => {
    setPaying(true);
    try {
      const rpRes = await paymentsApi.createOrder(order.id);

      if (!window.Razorpay) {
        showError("Payment gateway failed to load. Please refresh and try again.");
        return;
      }

      const { razorpayOrderId, amount, currency, keyId } = rpRes.data;

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        name: "Hearth",
        description: `Booking #${order.id}`,
        order_id: razorpayOrderId,
        theme: { color: "#f59e0b" },
        handler: async (response) => {
          try {
            await paymentsApi.verify({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setOrder((prev) => (prev ? { ...prev, paymentStatus: "paid" } : prev));
            showSuccess("Payment successful!");
          } catch (err) {
            // The browser-side verify call failed, but the charge may still have
            // gone through — the server-side webhook confirms it independently
            // a little after this. Check before telling the customer it failed.
            const settled = await waitForPaymentStatus(order.id);
            if (settled) {
              setOrder((prev) => (prev ? { ...prev, paymentStatus: "paid" } : prev));
              showSuccess("Payment successful!");
            } else {
              showError(err.message || "Payment could not be verified. Contact support if you were charged.");
            }
          }
        },
        modal: {
          ondismiss: async () => {
            // Closing the modal isn't proof of failure — give the webhook a
            // moment to confirm before assuming the payment didn't go through.
            const settled = await waitForPaymentStatus(order.id);
            if (settled) {
              setOrder((prev) => (prev ? { ...prev, paymentStatus: "paid" } : prev));
              showSuccess("Payment successful!");
            } else {
              showError("Payment wasn't completed.");
            }
          },
        },
      });

      rzp.on("payment.failed", async () => {
        const settled = await waitForPaymentStatus(order.id);
        if (settled) {
          setOrder((prev) => (prev ? { ...prev, paymentStatus: "paid" } : prev));
          showSuccess("Payment successful!");
        } else {
          showError("Payment failed. Please try again.");
        }
      });

      rzp.open();
    } catch (err) {
      showError(err.message || "Could not start payment.");
    } finally {
      setPaying(false);
    }
  };

  const getStepIndex = (status) => {
    const s = (status || "pending").toLowerCase();
    if (s === "pending") return 1;
    if (s === "confirmed" || s === "accepted") return 2;
    if (s === "in_progress") return 3;
    if (s === "completed") return 4;
    return 1;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-4xl px-6 py-12 w-full space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link to="/orders" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
              ← Back to My Bookings
            </Link>
            <h1 className="font-display text-3xl font-bold text-white mt-1">Booking #{id} Tracker</h1>
          </div>
          {order && (
            <div className="flex items-center gap-3">
              {(order.paymentStatus === "pending" || order.paymentStatus === "failed") &&
                (order.status || "").toLowerCase() !== "cancelled" && (
                  <button
                    type="button"
                    onClick={handlePayNow}
                    disabled={paying}
                    className={`${btnPrimary} px-4 py-1.5 text-sm`}
                  >
                    {paying ? "Opening payment…" : "Pay now"}
                  </button>
                )}
              {!["completed", "cancelled"].includes((order.status || "").toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className={`${btnDanger} px-3 py-1.5`}
                >
                  Cancel Booking
                </button>
              )}
              <StatusBadge status={order.status} />
            </div>
          )}
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="h-32 rounded-2xl bg-slate-900/60 animate-pulse" />
            <div className="h-64 rounded-2xl bg-slate-900/60 animate-pulse" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {error}
          </div>
        )}

        {order && (
          <>
            {/* Step-by-Step Status Tracker OR Cancelled Banner */}
            {(order.status || "").toLowerCase() === "cancelled" ? (
              <div className="rounded-3xl border border-red-500/30 bg-red-950/20 p-8 backdrop-blur-xl">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 text-xl font-black border border-red-500/30">
                    ✕
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-white">Booking Cancelled</h3>
                    <p className="text-xs text-red-300">
                      This service booking has been cancelled. No providers will be dispatched and any pending services have been stopped.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-xl space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Order Status Timeline</h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                  {[
                    { step: 1, title: "Order Placed", desc: "Booking received" },
                    { step: 2, title: "Provider Confirmed", desc: "Provider assigned" },
                    { step: 3, title: "Service In Progress", desc: "Specialist on site" },
                    { step: 4, title: "Completed", desc: "Work completed" },
                  ].map((s) => {
                    const activeStep = getStepIndex(order.status);
                    const isPassed = s.step <= activeStep;
                    const isCurrent = s.step === activeStep;

                    return (
                      <div key={s.step} className="flex flex-col items-center text-center space-y-2 relative z-10">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black text-sm transition-all ${
                            isCurrent
                              ? "bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 shadow-lg shadow-amber-500/30"
                              : isPassed
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-800 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {isPassed && !isCurrent ? "✓" : s.step}
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isPassed ? "text-slate-100" : "text-slate-500"}`}>
                            {s.title}
                          </p>
                          <p className="text-[11px] text-slate-500">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Booking Overview Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Scheduled Date</span>
                <p className="font-bold text-slate-200 mt-1">{formatDate(order.bookingDate)}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Status</span>
                <div className="mt-1">
                  <StatusBadge status={order.paymentStatus} />
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Amount</span>
                <p className="font-extrabold text-amber-400 text-xl mt-1">{formatMoney(order.totalAmount)}</p>
              </div>
            </div>

            {/* Booked Items Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold font-display text-white">Booked Services</h3>
              <div className="space-y-3">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-amber-400">Service #{item.serviceId}</span>
                          <Link
                            to={`/sellers/${item.sellerId}`}
                            className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 hover:text-white"
                          >
                            View Provider #{item.sellerId} Profile →
                          </Link>
                          {/* Each item has its own status — a combined order can
                              have several providers, and one declining their
                              job doesn't affect anyone else's. */}
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-sm font-bold text-slate-200">
                          Quantity: {item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-lg font-extrabold text-amber-400">
                          {formatMoney(item.price * item.quantity)}
                        </span>

                        {/* Cancel just this one item — for a combined booking
                            where the customer only wants to back out of one
                            provider's part, not the whole order. Only shown
                            while there's actually something to cancel. */}
                        {["pending", "accepted"].includes((item.status || "").toLowerCase()) && (
                          confirmCancelItemId === item.id ? (
                            <div className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/80 px-2.5 py-1">
                              <span className="text-xs font-semibold text-red-300">Cancel this item?</span>
                              <button
                                type="button"
                                disabled={cancellingItemId === item.id}
                                onClick={() => handleCancelItem(item.id)}
                                className="rounded-lg bg-red-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
                              >
                                {cancellingItemId === item.id ? "..." : "Yes"}
                              </button>
                              <button
                                type="button"
                                disabled={cancellingItemId === item.id}
                                onClick={() => setConfirmCancelItemId(null)}
                                className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelItemId(item.id)}
                              className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                            >
                              Cancel item
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Allow customer rating once THIS item is completed —
                        not gated on the whole order, since other items from
                        other providers may still be in progress. */}
                    {item.status === "completed" && (
                      <RateSellerInline orderId={order.id} sellerId={item.sellerId} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 text-xl font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cancel Booking #{id}?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to cancel this booking?</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">
              This will immediately cancel your appointment. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
                className={btnSecondary}
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelBooking}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/20 transition-all disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
