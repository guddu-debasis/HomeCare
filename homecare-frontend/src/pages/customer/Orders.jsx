import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ordersApi, downloadInvoice } from "../../lib/api";
import { formatMoney, formatDate } from "../../lib/format";
import { btnSecondary, btnDanger } from "../../lib/ui";
import { useToast } from "../../context/ToastContext";
import StatusBadge from "../../components/StatusBadge";
import Footer from "../../components/Footer";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    ordersApi
      .list()
      .then((res) => setOrders(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (e, orderId) => {
    e.preventDefault();
    e.stopPropagation();
    setCancellingId(orderId);
    try {
      await ordersApi.cancel(orderId);
      showSuccess(`Booking #${orderId} has been cancelled successfully.`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o))
      );
      setConfirmCancelId(null);
    } catch (err) {
      showError(err.message || "Failed to cancel booking.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadInvoice = async (e, orderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloadingInvoiceId(orderId);
    await downloadInvoice(orderId, { showError });
    setDownloadingInvoiceId(null);
  };

  const filteredOrders = orders.filter((o) => {
    const s = (o.status || "pending").toLowerCase();
    if (filter === "all") return true;
    if (filter === "active") return s === "pending" || s === "confirmed" || s === "accepted";
    if (filter === "completed") return s === "completed";
    if (filter === "cancelled") return s === "cancelled";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-5xl px-6 py-12 w-full space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">Customer Portal</span>
            <h1 className="font-display text-3xl font-bold text-white mt-1">My Service Bookings</h1>
          </div>
          <Link to="/" className={btnSecondary}>
            + Book New Service
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto">
          {[
            { id: "all", label: "All Bookings" },
            { id: "active", label: "Active & Upcoming" },
            { id: "completed", label: "Completed" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === tab.id
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="h-28 rounded-2xl bg-slate-900/60 animate-pulse" />
            <div className="h-28 rounded-2xl bg-slate-900/60 animate-pulse" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4 max-w-xl mx-auto">
            <div className="text-5xl">📋</div>
            <h3 className="font-display text-xl font-bold text-white">No Bookings Found</h3>
            <p className="text-slate-400 text-sm">
              {filter === "all"
                ? "You haven't placed any service bookings yet."
                : `No bookings matched the "${filter}" filter.`}
            </p>
            <Link to="/" className={btnSecondary}>
              Browse Services Catalog
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="group block rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md transition-all hover:border-amber-500/40 hover:bg-slate-900/90 shadow-xl"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                      Booking #{order.id}
                    </span>
                    <StatusBadge status={order.status} />
                    {order.paymentStatus && order.paymentStatus !== "paid" && (
                      <StatusBadge status={order.paymentStatus} />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      📅 Scheduled: <strong className="text-slate-200">{formatDate(order.bookingDate)}</strong>
                    </span>
                    <span>•</span>
                    <span>{order.items?.length || 1} Item(s)</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Cost</span>
                    <span className="text-lg font-extrabold text-amber-400">
                      {formatMoney(order.totalAmount)}
                    </span>
                  </div>

                  {order.paymentStatus === "paid" && (
                    <button
                      type="button"
                      onClick={(e) => handleDownloadInvoice(e, order.id)}
                      disabled={downloadingInvoiceId === order.id}
                      className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {downloadingInvoiceId === order.id ? "Preparing…" : "🧾 Invoice"}
                    </button>
                  )}

                  {!["completed", "cancelled"].includes((order.status || "").toLowerCase()) && (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      {confirmCancelId === order.id ? (
                        <div className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/80 px-2.5 py-1">
                          <span className="text-xs font-semibold text-red-300">Cancel?</span>
                          <button
                            type="button"
                            disabled={cancellingId === order.id}
                            onClick={(e) => handleCancel(e, order.id)}
                            className="rounded-lg bg-red-600 px-2 py-0.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
                          >
                            {cancellingId === order.id ? "..." : "Yes"}
                          </button>
                          <button
                            type="button"
                            disabled={cancellingId === order.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConfirmCancelId(null);
                            }}
                            className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmCancelId(order.id);
                          }}
                          className={`${btnDanger} text-xs py-1.5`}
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  )}

                  <span className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                    Track Details →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
