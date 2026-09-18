import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { btnPrimary, btnSecondary, input } from "../../lib/ui";
import Modal from "../../components/Modal";
import Footer from "../../components/Footer";

export default function PendingListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const { showSuccess, showError } = useToast();

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadData = () => {
    setLoading(true);
    adminApi
      .listPendingListings()
      .then((res) => setListings(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (listing) => {
    setActingId(listing.id);
    try {
      await adminApi.verifyListing(listing.id, { status: "approved" });
      showSuccess(`Approved "${listing.serviceName}" by ${listing.sellerName}.`);
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
    } catch (err) {
      showError(err.message || "Failed to approve listing.");
    } finally {
      setActingId(null);
    }
  };

  const openRejectModal = (listing) => {
    setRejectTarget(listing);
    setRejectionReason("");
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      showError("Please provide a reason so the seller knows what to fix.");
      return;
    }

    setActingId(rejectTarget.id);
    try {
      await adminApi.verifyListing(rejectTarget.id, {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      showSuccess(`Rejected "${rejectTarget.serviceName}" by ${rejectTarget.sellerName}.`);
      setListings((prev) => prev.filter((l) => l.id !== rejectTarget.id));
      setRejectTarget(null);
    } catch (err) {
      showError(err.message || "Failed to reject listing.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-6xl px-6 py-12 w-full space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
            System Admin Portal
          </span>
          <h1 className="font-display text-3xl font-bold text-white mt-1">
            Pending Seller Listings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            A seller's listing stays invisible to customers until you approve it here — same rule
            applies whenever a seller edits an already-approved listing's price or description.
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="h-32 rounded-2xl bg-slate-900/60 animate-pulse" />
            <div className="h-32 rounded-2xl bg-slate-900/60 animate-pulse" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-3 max-w-xl mx-auto">
            <div className="text-5xl">✅</div>
            <h3 className="font-display text-xl font-bold text-white">All caught up</h3>
            <p className="text-slate-400 text-sm">No listings are waiting for review right now.</p>
          </div>
        )}

        {!loading && !error && listings.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                      ⏳ Pending
                    </span>
                    <span className="text-[11px] text-slate-500">Listing #{listing.id}</span>
                  </div>

                  <h3 className="font-display text-lg font-bold text-white">
                    {listing.serviceName}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-3">
                    {listing.description || "No description provided."}
                  </p>

                  <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/80 text-xs space-y-1">
                    <p>
                      <span className="text-slate-500 font-semibold">Provider:</span>{" "}
                      <span className="text-slate-200 font-medium">
                        {listing.sellerName} (#{listing.sellerId})
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500 font-semibold">Contact:</span>{" "}
                      <span className="text-slate-300">
                        {listing.sellerEmail}
                        {listing.sellerPhone ? ` · ${listing.sellerPhone}` : ""}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Rate
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-extrabold text-amber-400">
                        {formatMoney(listing.customPrice ?? listing.basePrice)}
                      </span>
                      {listing.customPrice && (
                        <span className="text-xs text-slate-500 line-through">
                          {formatMoney(listing.basePrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={actingId === listing.id}
                      onClick={() => handleApprove(listing)}
                      className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                    >
                      {actingId === listing.id ? "..." : "Approve"}
                    </button>
                    <button
                      disabled={actingId === listing.id}
                      onClick={() => openRejectModal(listing)}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={`Reject "${rejectTarget?.serviceName || ""}"`}
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Reason (shown to the seller)
            </label>
            <textarea
              required
              rows={4}
              className={input}
              placeholder="E.g. Price seems inconsistent with the base rate, description needs more detail..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={() => setRejectTarget(null)} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={actingId === rejectTarget?.id} className={btnPrimary}>
              {actingId === rejectTarget?.id ? "Rejecting..." : "Reject Listing"}
            </button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}
