import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { sellerServicesApi, servicesApi } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { btnPrimary, btnSecondary, input } from "../../lib/ui";
import Modal from "../../components/Modal";
import Footer from "../../components/Footer";

export default function MyServices() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [offerings, setOfferings] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({ serviceId: "", customPrice: "", description: "" });
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      sellerServicesApi.listForSeller(user.id),
      servicesApi.list(),
    ])
      .then(([offeringsRes, catalogRes]) => {
        setOfferings(offeringsRes.data || []);
        setCatalog(catalogRes.data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.id) loadData();
  }, [user?.id]);

  const availableToAdd = catalog.filter(
    (s) => !offerings.some((o) => o.serviceId === s.id)
  );

  const copyProfileLink = () => {
    const url = `${window.location.origin}/sellers/${user.id}`;
    navigator.clipboard.writeText(url);
    showSuccess(`Profile link copied! (${url})`);
  };

  const addOffering = async (e) => {
    e.preventDefault();
    if (!form.serviceId) {
      showError("Please select a service from the catalog.");
      return;
    }

    setSaving(true);
    try {
      await sellerServicesApi.add({
        serviceId: Number(form.serviceId),
        customPrice: form.customPrice ? Number(form.customPrice) : undefined,
        description: form.description || undefined,
      });
      showSuccess("Service added to your active offerings!");
      setForm({ serviceId: "", customPrice: "", description: "" });
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      showError(err.message || "Failed to add service offering.");
    } finally {
      setSaving(false);
    }
  };

  const removeOffering = async (serviceId) => {
    if (!confirm("Are you sure you want to remove this service from your offerings?")) return;
    try {
      await sellerServicesApi.remove(serviceId);
      showSuccess("Service offering removed.");
      setOfferings((prev) => prev.filter((o) => o.serviceId !== serviceId));
    } catch (err) {
      showError(err.message || "Failed to remove service.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-6xl px-6 py-12 w-full space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Provider Control Panel</span>
            <h1 className="font-display text-3xl font-bold text-white mt-1">My Service Offerings</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={copyProfileLink} className={btnSecondary}>
              🔗 Share Profile Link
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className={btnPrimary}>
              + Add Service Offering
            </button>
          </div>
        </div>

        {/* Dashboard Banner Widget */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 backdrop-blur-xl grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 font-bold text-xl">
              🆔
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Your Provider ID</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-white">#{user?.id}</span>
                <Link
                  to={`/sellers/${user?.id}`}
                  className="text-xs font-semibold text-amber-400 hover:underline"
                >
                  (View Public Profile)
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 font-bold text-xl">
              📦
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Offerings</span>
              <span className="text-2xl font-extrabold text-emerald-400">{offerings.length} Listed</span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 font-bold text-xl">
              📚
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Master Catalog</span>
              <span className="text-2xl font-extrabold text-slate-200">{availableToAdd.length} Available</span>
            </div>
          </div>
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

        {!loading && !error && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-display text-xl font-bold text-white">Your Listed Services</h2>
              <span className="text-xs text-slate-400">{offerings.length} Active Services</span>
            </div>

            {offerings.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4 max-w-xl mx-auto">
                <div className="text-5xl">🛠️</div>
                <h3 className="font-display text-xl font-bold text-white">No Offerings Listed Yet</h3>
                <p className="text-slate-400 text-sm">
                  Add services from the master catalog so customers can view your rates and book you.
                </p>
                <button onClick={() => setIsAddModalOpen(true)} className={btnPrimary}>
                  + Add Your First Offering
                </button>
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
                        <span className="text-xs font-semibold text-amber-400">Service #{offering.serviceId}</span>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          Active
                        </span>
                      </div>

                      <h3 className="font-display text-xl font-bold text-white">{offering.serviceName}</h3>
                      <p className="text-xs text-slate-300">
                        {offering.description || "Default catalog description."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Your Price</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-extrabold text-amber-400">
                            {formatMoney(offering.customPrice ?? offering.basePrice)}
                          </span>
                          {offering.customPrice && (
                            <span className="text-xs text-slate-500 line-through">
                              Base: {formatMoney(offering.basePrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => removeOffering(offering.serviceId)}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        Remove Offering
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Offering Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Service Offering"
      >
        <form onSubmit={addOffering} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Service from Master Catalog
            </label>
            <select
              required
              className={input}
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            >
              <option value="" disabled>
                Select service...
              </option>
              {availableToAdd.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serviceName} (Base Price: {formatMoney(s.basePrice)})
                </option>
              ))}
            </select>
            {availableToAdd.length === 0 && (
              <p className="mt-1 text-xs text-amber-400">
                You already offer all services available in the catalog!
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your Custom Rate (Optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={input}
              placeholder="Leave blank to charge standard base price"
              value={form.customPrice}
              onChange={(e) => setForm({ ...form, customPrice: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Custom Service Description (Optional)
            </label>
            <textarea
              rows={3}
              className={input}
              placeholder="Add your specialized details, equipment used, warranty, etc."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || availableToAdd.length === 0}
              className={btnPrimary}
            >
              {saving ? "Adding..." : "Add to My Offerings"}
            </button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}
