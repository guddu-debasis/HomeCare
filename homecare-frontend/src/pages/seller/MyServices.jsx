import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { sellerServicesApi, servicesApi } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { card, input, label, btnAccent, btnDanger, errorText } from "../../lib/ui";

export default function MyServices() {
  const { user } = useAuth();
  const [offerings, setOfferings] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ serviceId: "", customPrice: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
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

  useEffect(load, [user.id]);

  const availableToAdd = catalog.filter(
    (s) => !offerings.some((o) => o.serviceId === s.id)
  );

  const addOffering = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await sellerServicesApi.add({
        serviceId: Number(form.serviceId),
        customPrice: form.customPrice ? Number(form.customPrice) : undefined,
        description: form.description || undefined,
      });
      setForm({ serviceId: "", customPrice: "", description: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeOffering = async (serviceId) => {
    setError("");
    try {
      await sellerServicesApi.remove(serviceId);
      setOfferings((prev) => prev.filter((o) => o.serviceId !== serviceId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl text-ink">My offerings</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your public profile is at{" "}
        <code className="rounded bg-pine-light px-1.5 py-0.5 text-pine-dark">
          /sellers/{user.id}
        </code>{" "}
        — share this with customers.
      </p>

      {error && <p className={`${errorText} mt-6`}>{error}</p>}
      {loading && <p className="mt-6 text-sm text-ink-soft">Loading…</p>}

      {!loading && (
        <>
          <ul className="mt-6 space-y-3">
            {offerings.length === 0 && (
              <p className="text-sm text-ink-soft">
                You haven't listed any services yet — add one below.
              </p>
            )}
            {offerings.map((o) => (
              <li key={o.id} className={`${card} flex items-center justify-between`}>
                <div>
                  <p className="font-medium text-ink">{o.serviceName}</p>
                  {o.description && (
                    <p className="text-sm text-ink-soft">{o.description}</p>
                  )}
                  <p className="text-sm text-pine">
                    {formatMoney(o.customPrice ?? o.basePrice)}
                    {o.customPrice && (
                      <span className="ml-2 text-xs text-ink-faint">
                        (base {formatMoney(o.basePrice)})
                      </span>
                    )}
                  </p>
                </div>
                <button onClick={() => removeOffering(o.serviceId)} className={btnDanger}>
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={addOffering} className={`${card} mt-6 space-y-4`}>
            <h2 className="font-display text-lg text-ink">Add a service</h2>

            <div>
              <label className={label}>Service</label>
              <select
                required
                className={input}
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              >
                <option value="" disabled>
                  Select from the catalog
                </option>
                {availableToAdd.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.serviceName} (base {formatMoney(s.basePrice)})
                  </option>
                ))}
              </select>
              {availableToAdd.length === 0 && (
                <p className="mt-1 text-xs text-ink-faint">
                  You already offer everything in the catalog.
                </p>
              )}
            </div>

            <div>
              <label className={label}>Your price (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={input}
                placeholder="Leave blank to use the base price"
                value={form.customPrice}
                onChange={(e) => setForm({ ...form, customPrice: e.target.value })}
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

            <button
              disabled={saving || availableToAdd.length === 0}
              className={btnAccent}
            >
              {saving ? "Adding…" : "Add to my profile"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
