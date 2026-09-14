import { useEffect, useState } from "react";
import { servicesApi } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { btnPrimary, btnSecondary, input } from "../../lib/ui";
import Modal from "../../components/Modal";
import Footer from "../../components/Footer";

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { showSuccess, showError } = useToast();

  // Modal Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({ serviceName: "", basePrice: "", description: "" });
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    servicesApi
      .list()
      .then((res) => setServices(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredServices = services.filter((s) =>
    s.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgBasePrice = services.length
    ? services.reduce((acc, s) => acc + Number(s.basePrice || 0), 0) / services.length
    : 0;

  const addService = async (e) => {
    e.preventDefault();
    if (!form.serviceName.trim() || !form.basePrice) {
      showError("Please provide service name and base price.");
      return;
    }

    setSaving(true);
    try {
      await servicesApi.create({
        serviceName: form.serviceName.trim(),
        basePrice: Number(form.basePrice),
        description: form.description?.trim() || undefined,
      });
      showSuccess(`Master service "${form.serviceName}" added to catalog!`);
      setForm({ serviceName: "", basePrice: "", description: "" });
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      showError(err.message || "Failed to add master service.");
    } finally {
      setSaving(false);
    }
  };

  const removeService = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the master catalog?`)) return;
    try {
      await servicesApi.remove(id);
      showSuccess(`Service "${name}" removed from master catalog.`);
      setServices((prev) => prev.filter((s) => s.id !== id));
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
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">System Admin Portal</span>
            <h1 className="font-display text-3xl font-bold text-white mt-1">Master Service Catalog</h1>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className={btnPrimary}>
            + Add Master Service
          </button>
        </div>

        {/* Dashboard Banner Stats */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 backdrop-blur-xl grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 font-bold text-xl">
              📚
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Catalog Items</span>
              <span className="text-2xl font-extrabold text-white">{services.length} Services</span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 font-bold text-xl">
              💵
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Average Base Price</span>
              <span className="text-2xl font-extrabold text-emerald-400">{formatMoney(avgBasePrice)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 font-bold text-xl">
              🛡️
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Catalog Visibility</span>
              <span className="text-2xl font-extrabold text-slate-200">Global</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4 p-2 rounded-2xl border border-slate-800 bg-slate-900/60">
          <input
            type="text"
            placeholder="Search master catalog services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="px-3 py-1 text-xs text-slate-400 hover:text-white">
              Clear
            </button>
          )}
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

        {!loading && !error && (
          <div className="space-y-6">
            {filteredServices.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4 max-w-xl mx-auto">
                <div className="text-5xl">📋</div>
                <h3 className="font-display text-xl font-bold text-white">No Services Found</h3>
                <p className="text-slate-400 text-sm">
                  {searchQuery ? `No catalog items matched "${searchQuery}".` : "No master services in the catalog."}
                </p>
                <button onClick={() => setIsAddModalOpen(true)} className={btnPrimary}>
                  + Add Master Service
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-400">ID #{service.id}</span>
                        <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                          Catalog Item
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-white">{service.serviceName}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {service.description || "Standard master catalog service item."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Base Price</span>
                        <span className="text-lg font-extrabold text-amber-400">
                          {formatMoney(service.basePrice)}
                        </span>
                      </div>

                      <button
                        onClick={() => removeService(service.id, service.serviceName)}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        Delete Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Master Service Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Master Catalog Service"
      >
        <form onSubmit={addService} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Service Name
            </label>
            <input
              required
              minLength={2}
              type="text"
              placeholder="e.g. Deep Carpet Cleaning, HVAC Tune-Up"
              value={form.serviceName}
              onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
              className={input}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Base Price ($)
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 75.00"
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              className={input}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Explain what this standard service entails..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={input}
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
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Adding..." : "Create Catalog Service"}
            </button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}
