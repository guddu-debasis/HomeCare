import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { sellerServicesApi, ratingsApi, cartApi } from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { btnPrimary, btnSecondary, input } from "../lib/ui";
import Stars from "../components/Stars";
import Modal from "../components/Modal";
import Footer from "../components/Footer";

export default function SellerProfile() {
  const { sellerId } = useParams();
  const { role, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();

  const [offerings, setOfferings] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingId, setAddingId] = useState(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError("");
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

  useEffect(() => {
    loadData();
  }, [sellerId]);

  const avgRating = ratings.length
    ? ratings.reduce((sum, r) => sum + Number(r.ratingScore || 0), 0) / ratings.length
    : 0;

  const copySellerId = () => {
    navigator.clipboard.writeText(sellerId);
    showSuccess(`Provider ID #${sellerId} copied to clipboard!`);
  };

  const addToCart = async (serviceId) => {
    if (!isAuthenticated) {
      showError("Please log in as a customer to add services to your cart.");
      return;
    }
    if (role !== "customer") {
      showError("Only customer accounts can add services to cart.");
      return;
    }

    setAddingId(serviceId);
    try {
      await cartApi.add({ serviceId, sellerId: Number(sellerId), quantity: 1 });
      showSuccess("Service added to your cart successfully!");
    } catch (err) {
      showError(err.message || "Failed to add service to cart.");
    } finally {
      setAddingId(null);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      showError("Please enter a comment for your review.");
      return;
    }

    setSubmittingReview(true);
    try {
      await ratingsApi.add({
        sellerId: Number(sellerId),
        ratingScore,
        comment: comment.trim(),
      });
      showSuccess("Thank you! Your review has been submitted.");
      setIsReviewModalOpen(false);
      setComment("");
      setRatingScore(5);
      loadData(); // Refresh reviews
    } catch (err) {
      showError(err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div>
        {/* Header Profile Banner */}
        <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-3xl shadow-xl shadow-amber-600/20">
                  P#{sellerId}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                      Verified HomeCare Provider
                    </span>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      Active
                    </span>
                  </div>

                  <h1 className="font-display text-3xl font-bold text-white">
                    Provider #{sellerId}
                  </h1>

                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    {ratings.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Stars value={avgRating} />
                        <span className="font-bold text-slate-200">{avgRating.toFixed(1)}</span>
                        <span>({ratings.length} review{ratings.length !== 1 ? "s" : ""})</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">No reviews yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button onClick={copySellerId} className={btnSecondary}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Provider ID
                </button>

                {role === "customer" && (
                  <button onClick={() => setIsReviewModalOpen(true)} className={btnPrimary}>
                    ★ Leave a Review
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <div className="mx-auto max-w-6xl px-6 py-12 space-y-12">
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

          {!loading && (
            <>
              {/* Offerings Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">Service Offerings</h2>
                    <p className="text-sm text-slate-400">Services currently available for booking from Provider #{sellerId}</p>
                  </div>
                  <span className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                    {offerings.length} Available
                  </span>
                </div>

                {offerings.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-2">
                    <p className="text-slate-400">This provider has not added any custom service offerings yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {offerings.map((offering) => (
                      <div
                        key={offering.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-display text-xl font-bold text-white">
                              {offering.serviceName}
                            </h3>
                            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                              Active Listing
                            </span>
                          </div>

                          <p className="text-sm text-slate-300">
                            {offering.description || "Provider custom home service package."}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Rate</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-extrabold text-amber-400">
                                {formatMoney(offering.customPrice ?? offering.basePrice)}
                              </span>
                              {offering.customPrice && (
                                <span className="text-xs text-slate-500 line-through">
                                  {formatMoney(offering.basePrice)}
                                </span>
                              )}
                            </div>
                          </div>

                          {role === "customer" ? (
                            <button
                              onClick={() => addToCart(offering.serviceId)}
                              disabled={addingId === offering.serviceId}
                              className={btnPrimary}
                            >
                              {addingId === offering.serviceId ? "Adding..." : "🛒 Add to Cart"}
                            </button>
                          ) : !isAuthenticated ? (
                            <Link to="/login" className={btnSecondary}>
                              Log in to Book
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Customer Reviews Section */}
              <section className="space-y-6 pt-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">Customer Reviews</h2>
                    <p className="text-sm text-slate-400">Verified feedback and ratings from previous bookings</p>
                  </div>

                  {role === "customer" && (
                    <button onClick={() => setIsReviewModalOpen(true)} className={btnSecondary}>
                      + Write Review
                    </button>
                  )}
                </div>

                {ratings.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-3">
                    <p className="text-slate-400">No customer reviews yet for this provider.</p>
                    {role === "customer" && (
                      <button onClick={() => setIsReviewModalOpen(true)} className={btnPrimary}>
                        Be the first to review
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {ratings.map((rating) => (
                      <div
                        key={rating.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Stars value={rating.ratingScore} size="text-lg" />
                            <span className="text-sm font-bold text-amber-400">
                              {rating.ratingScore} / 5
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {formatDate(rating.createdAt)}
                          </span>
                        </div>

                        {rating.comment && (
                          <p className="text-sm text-slate-300 leading-relaxed italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                            "{rating.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Leave Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Review Provider #${sellerId}`}
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your Rating Score
            </label>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950">
              <Stars value={ratingScore} onChange={setRatingScore} size="text-2xl" />
              <span className="text-sm font-bold text-amber-400">{ratingScore} of 5 Stars</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your Review / Experience
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe the service quality, punctuality, and overall experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={input}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button type="submit" disabled={submittingReview} className={btnPrimary}>
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}
