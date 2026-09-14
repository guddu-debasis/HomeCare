import { useEffect, useState } from "react";
import { servicesApi } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { card, input, label, btnAccent, btnDanger, errorText } from "../../lib/ui";

export default function ManageServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ serviceName: "", basePrice: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    servicesApi
      .list()
      .then((res) => setServices(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const addService = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await servicesApi.create({
        serviceName: form.serviceName,
        basePrice: Number(form.basePrice),
        description: form.description || undefined,
      });
      setForm({ serviceName: "", basePrice: "", description: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeService = async (id) => {
    setError("");
    try {
      await servicesApi.remove(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-ink">Service catalog</h1>
      <p className="mt-1 text-sm text-ink-soft">
        These are the master services providers can offer and customers can book.
      </p>

      {error && <p className={`${errorText} mt-6`}>{error}</p>}
      {loading && <p className="mt-6 text-sm text-ink-soft">Loading…</p>}

      {!loading && (
        <>
          <ul className="mt-6 space-y-3">
            {services.length === 0 && (
              <p className="text-sm text-ink-soft">No services yet — add the first one below.</p>
            )}
            {services.map((s) => (
              <li key={s.id} className={`${card} flex items-center justify-between`}>
                <div>
                  <p className="font-medium text-ink">{s.serviceName}</p>
                  {s.description && (
                    <p className="text-sm text-ink-soft">{s.description}</p>
                  )}
                  <p className="text-sm text-pine">{formatMoney(s.basePrice)}</p>
                </div>
                <button onClick={() => removeService(s.id)} className={btnDanger}>
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={addService} className={`${card} mt-6 space-y-4`}>
            <h2 className="font-display text-lg text-ink">Add a service</h2>

            <div>
              <label className={label}>Name</label>
              <input
                required
                minLength={2}
                className={input}
                value={form.serviceName}
                onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
              />
            </div>

            <div>
              <label className={label}>Base price</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                className={input}
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              />
            </div>

            <div>
              <label className={label}>Description (optional)</label>
              <input
                className={input}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <button disabled={saving} className={btnAccent}>
              {saving ? "Adding…" : "Add to catalog"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
