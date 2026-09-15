import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { sellerServicesApi, servicesApi, sellerBookingsApi } from "../../lib/api";
import { formatMoney } from "../../lib/format";
import { btnPrimary, btnSecondary, input } from "../../lib/ui";
import Modal from "../../components/Modal";
import Footer from "../../components/Footer";

const SERVICE_ICONS = {
  plumb: "🚰",
  clean: "🧹",
  electr: "⚡",
  paint: "🎨",
  carpent: "🪚",
  pest: "🐜",
  appliance: "🧺",
  ac: "❄️",
  repair: "🛠️",
};

const getIcon = (name = "") => {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SERVICE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "🔧";
};

export default function MyServices() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  // Data
  const [offerings, setOfferings] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [bookings, setBookings] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("services"); // "services" | "bookings"
  const [updatingBooking, setUpdatingBooking] = useState(null);
  const [addingServiceId, setAddingServiceId] = useState(null);
  const [bookingDateSort, setBookingDateSort] = useState("scheduled-desc"); // "scheduled-desc" | "scheduled-asc" | "created-desc" | "created-asc"
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");

  // Customize Rate / Add Offering Modal
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [customPrice, setCustomPrice] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  // Create New Service in Catalog Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [autoAddToOfferings, setAutoAddToOfferings] = useState(true);
  const [creatingService, setCreatingService] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError("");

    try {
      const [offeringsRes, catalogRes, bookingsRes] = await Promise.all([
        sellerServicesApi.listForSeller(user.id).catch(() => ({ data: [] })),
        servicesApi.list().catch(() => ({ data: [] })),
        sellerBookingsApi.list().catch(() => ({ data: [] })),
      ]);

      setOfferings(offeringsRes.data || []);
      setCatalog(catalogRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const availableToAdd = catalog.filter(
    (s) => !offerings.some((o) => o.serviceId === s.id)
  );

  const sortedBookings = [...bookings]
    .filter((b) => bookingStatusFilter === "all" || b.status === bookingStatusFilter)
    .sort((a, b) => {
      if (bookingDateSort === "scheduled-desc") {
        return new Date(b.bookingDate || 0) - new Date(a.bookingDate || 0);
      }
      if (bookingDateSort === "scheduled-asc") {
        return new Date(a.bookingDate || 0) - new Date(b.bookingDate || 0);
      }
      if (bookingDateSort === "created-desc") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (bookingDateSort === "created-asc") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      return 0;
    });

  const copyProfileLink = () => {
    const url = `${window.location.origin}/sellers/${user.id}`;
    navigator.clipboard.writeText(url);
    showSuccess(`Public profile link copied! (${url})`);
  };

  // 1-Click Quick Add at standard base price
  const handleQuickAdd = async (srv) => {
    setAddingServiceId(srv.id);
    try {
      await sellerServicesApi.add({
        serviceId: srv.id,
      });
      showSuccess(`Added "${srv.serviceName}" to your active offerings!`);
      await loadData();
    } catch (err) {
      showError(err.message || "Failed to add service offering.");
    } finally {
      setAddingServiceId(null);
    }
  };

  // Open Customize Rate Modal
  const openRateModal = (srv, existingOffering = null) => {
    setSelectedService(srv);
    setCustomPrice(existingOffering?.customPrice ?? "");
    setCustomDesc(existingOffering?.description ?? "");
    setIsRateModalOpen(true);
  };

  // Save Customized Rate
  const handleSaveRate = async (e) => {
    e.preventDefault();
    if (!selectedService) return;

    setSavingRate(true);
    try {
      await sellerServicesApi.add({
        serviceId: selectedService.id,
        customPrice: customPrice !== "" && customPrice !== null ? Number(customPrice) : null,
        description: customDesc || null,
      });
      showSuccess(`Rate updated for "${selectedService.serviceName}"!`);
      setIsRateModalOpen(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Failed to save service rate.");
    } finally {
      setSavingRate(false);
    }
  };

  // Remove Offering
  const handleRemoveOffering = async (serviceId, serviceName) => {
    if (!confirm(`Remove "${serviceName}" from your active profile offerings?`)) return;
    try {
      await sellerServicesApi.remove(serviceId);
      showSuccess(`Removed "${serviceName}" from your offerings.`);
      setOfferings((prev) => prev.filter((o) => o.serviceId !== serviceId));
    } catch (err) {
      showError(err.message || "Failed to remove service.");
    }
  };

  // Create Brand-New Service into Master Catalog
  const handleCreateNewService = async (e) => {
    e.preventDefault();
    if (!newServiceName.trim() || !newServicePrice) {
      showError("Please provide service name and base price.");
      return;
    }

    setCreatingService(true);
    try {
      const res = await servicesApi.create({
        serviceName: newServiceName.trim(),
        basePrice: Number(newServicePrice),
        description: newServiceDesc.trim() || undefined,
      });

      const created = res.data;
      showSuccess(`Created new service "${created.serviceName}"!`);

      if (autoAddToOfferings && created?.id) {
        await sellerServicesApi.add({
          serviceId: created.id,
        });
        showSuccess(`Added "${created.serviceName}" directly to your offerings!`);
      }

      setNewServiceName("");
      setNewServicePrice("");
      setNewServiceDesc("");
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err) {
      showError(err.message || "Failed to create service.");
    } finally {
      setCreatingService(false);
    }
  };

  // Update Booking Status
  const handleUpdateBookingStatus = async (bookingId, status) => {
    setUpdatingBooking(bookingId);
    try {
      await sellerBookingsApi.updateStatus(bookingId, status);
      showSuccess(`Booking marked as ${status}!`);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
    } catch (err) {
      showError(err.message || "Failed to update booking status.");
    } finally {
      setUpdatingBooking(null);
    }
  };

  const pendingBookingsCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <div className="mx-auto max-w-7xl px-6 py-10 w-full space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-amber-400">
              Provider Control Hub
            </span>
            <h1 className="font-display text-3xl font-bold text-white mt-1">
              Provider Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your active service rates, browse master catalog, and fulfill incoming client jobs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={copyProfileLink} className={btnSecondary}>
              🔗 Share Profile Link
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className={btnPrimary}>
              + Create Custom Service
            </button>
          </div>
        </div>

        {/* Dashboard Banner Stats Widget */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 backdrop-blur-xl grid grid-cols-1 sm:grid-cols-4 gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xl">
              🆔
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Provider ID
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-white">#{user?.id}</span>
                <Link
                  to={`/sellers/${user?.id}`}
                  className="text-xs font-semibold text-amber-400 hover:underline"
                >
                  (View Storefront)
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xl">
              📦
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Active Offerings
              </span>
              <span className="text-2xl font-extrabold text-emerald-400">
                {offerings.length} Listed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xl">
              📅
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Client Bookings
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-blue-400">
                  {bookings.length}
                </span>
                {pendingBookingsCount > 0 && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    {pendingBookingsCount} Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-4 sm:pt-0 sm:pl-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold text-xl">
              📚
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Master Catalog
              </span>
              <span className="text-2xl font-extrabold text-slate-200">
                {catalog.length} Services
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("services")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "services"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <span>🛠️ My Services & Catalog</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === "services"
                  ? "bg-slate-950/20 text-slate-950 font-black"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {offerings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === "bookings"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <span>📋 Incoming Client Bookings</span>
            {pendingBookingsCount > 0 ? (
              <span className="rounded-full bg-red-500 text-white text-xs px-2 py-0.5 font-black animate-pulse">
                {pendingBookingsCount} New
              </span>
            ) : (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  activeTab === "bookings"
                    ? "bg-slate-950/20 text-slate-950 font-black"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {bookings.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-44 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            <div className="h-44 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {error}
          </div>
        )}

        {/* TAB 1: SERVICES & CATALOG (Unified Single-Screen View) */}
        {!loading && !error && activeTab === "services" && (
          <div className="space-y-12">
            {/* SECTION 1: Active Offerings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                    <span>Active Profile Offerings</span>
                    <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                      Visible to Homeowners
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Services currently listed under your provider profile with your custom pricing.
                  </p>
                </div>
              </div>

              {offerings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-amber-500/30 bg-amber-500/5 p-8 text-center space-y-3">
                  <div className="text-4xl">⚡</div>
                  <h3 className="font-display text-lg font-bold text-white">
                    You Have No Active Offerings Listed
                  </h3>
                  <p className="text-slate-400 text-sm max-w-lg mx-auto">
                    Customers cannot book you until you list services. Pick from the available platform catalog below or create your own custom service to start receiving jobs!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {offerings.map((offering) => (
                    <div
                      key={offering.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-md flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{getIcon(offering.serviceName)}</span>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                            Active Offering
                          </span>
                        </div>

                        <h3 className="font-display text-xl font-bold text-white">
                          {offering.serviceName}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {offering.description || "Standard platform service coverage."}
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Your Rate
                          </span>
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

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              openRateModal(
                                { id: offering.serviceId, serviceName: offering.serviceName, basePrice: offering.basePrice },
                                offering
                              )
                            }
                            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                          >
                            Edit Rate
                          </button>
                          <button
                            onClick={() =>
                              handleRemoveOffering(offering.serviceId, offering.serviceName)
                            }
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: Master Service Catalog (Quick-Add) */}
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                    <span>Available Services in Master Catalog</span>
                    <span className="text-xs font-normal text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
                      {availableToAdd.length} Available to Add
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Instantly add any of these pre-configured home care services to your active profile with 1 click.
                  </p>
                </div>
              </div>

              {availableToAdd.length === 0 ? (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center space-y-3">
                  <div className="text-4xl">🎉</div>
                  <h3 className="font-display text-lg font-bold text-emerald-400">
                    You Offer All Catalog Services!
                  </h3>
                  <p className="text-emerald-200/70 text-xs max-w-md mx-auto">
                    Every service from the platform master catalog is currently active on your profile. Need to offer a specialized skill? Use the "+ Create Custom Service" button above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {availableToAdd.map((srv) => (
                    <div
                      key={srv.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md flex flex-col justify-between transition-all hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{getIcon(srv.serviceName)}</span>
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
                            Base: {formatMoney(srv.basePrice)}
                          </span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-white">
                          {srv.serviceName}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {srv.description || "Standard platform certified home care service."}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          disabled={addingServiceId === srv.id}
                          onClick={() => handleQuickAdd(srv)}
                          className="flex-1 rounded-xl bg-amber-500 text-slate-950 font-bold py-2 text-xs hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/10"
                        >
                          {addingServiceId === srv.id ? "Adding..." : "+ 1-Click Add"}
                        </button>
                        <button
                          onClick={() => openRateModal(srv)}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          Custom Rate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INCOMING CLIENT BOOKINGS */}
        {!loading && !error && activeTab === "bookings" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Incoming Client Bookings
                </h2>
                <p className="text-xs text-slate-400">
                  Customer bookings assigned directly to you. Accept jobs and mark them complete upon finishing service.
                </p>
              </div>

              {/* Sorting & Filtering Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-sm">
                  <span className="text-slate-400 font-medium">Sort by:</span>
                  <select
                    value={bookingDateSort}
                    onChange={(e) => setBookingDateSort(e.target.value)}
                    className="bg-transparent text-amber-400 font-semibold outline-none cursor-pointer"
                  >
                    <option value="scheduled-desc" className="bg-slate-900 text-white">📅 Scheduled Date (Newest First)</option>
                    <option value="scheduled-asc" className="bg-slate-900 text-white">📅 Scheduled Date (Earliest First)</option>
                    <option value="created-desc" className="bg-slate-900 text-white">⏱️ Booking Placed (Most Recent)</option>
                    <option value="created-asc" className="bg-slate-900 text-white">⏱️ Booking Placed (Oldest)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-sm">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <select
                    value={bookingStatusFilter}
                    onChange={(e) => setBookingStatusFilter(e.target.value)}
                    className="bg-transparent text-white font-semibold outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900 text-white">All Statuses</option>
                    <option value="pending" className="bg-slate-900 text-white">Pending</option>
                    <option value="accepted" className="bg-slate-900 text-white">Accepted</option>
                    <option value="completed" className="bg-slate-900 text-white">Completed</option>
                    <option value="cancelled" className="bg-slate-900 text-white">Cancelled</option>
                  </select>
                </div>

                <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1.5 rounded-xl font-semibold">
                  {sortedBookings.length} {sortedBookings.length === 1 ? "Booking" : "Bookings"}
                </span>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4 max-w-xl mx-auto">
                <div className="text-5xl">📅</div>
                <h3 className="font-display text-xl font-bold text-white">No Bookings Yet</h3>
                <p className="text-slate-400 text-sm">
                  When homeowners select your provider profile and place an order, their booking details will appear right here.
                </p>
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
                <p className="text-slate-300 font-semibold text-sm">No bookings match the selected status filter.</p>
                <button
                  type="button"
                  onClick={() => setBookingStatusFilter("all")}
                  className="text-xs text-amber-400 hover:underline font-medium"
                >
                  Show all bookings ({bookings.length})
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedBookings.map((booking) => {
                  const itemPrice = Number(booking.price || 0);
                  const itemQty = Number(booking.quantity || 1);
                  const totalPayout = itemPrice * itemQty;

                  return (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col lg:flex-row gap-6 hover:border-slate-700 transition-all"
                    >
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md">
                            Booking #{booking.id}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md ${
                              booking.status === "pending"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : booking.status === "accepted"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : booking.status === "completed"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {booking.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            Scheduled:{" "}
                            <strong className="text-slate-200">
                              {booking.bookingDate
                                ? new Date(booking.bookingDate).toLocaleDateString(undefined, {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "Date not specified"}
                            </strong>
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-lg text-white">
                            {booking.serviceName || "Home Care Service"}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Qty: {itemQty} × {formatMoney(itemPrice)}
                          </p>
                        </div>

                        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs space-y-1.5">
                          <p>
                            <span className="text-slate-500 font-semibold">Client Name:</span>{" "}
                            <span className="text-slate-200 font-medium">{booking.customerName || "N/A"}</span>
                          </p>
                          <p>
                            <span className="text-slate-500 font-semibold">Contact Email:</span>{" "}
                            <span className="text-slate-300">{booking.customerEmail || "N/A"}</span>
                          </p>
                          <p>
                            <span className="text-slate-500 font-semibold">Phone:</span>{" "}
                            <span className="text-slate-300">{booking.customerPhone || "N/A"}</span>
                          </p>
                          <p>
                            <span className="text-slate-500 font-semibold">Service Location:</span>{" "}
                            <span className="text-slate-200 font-medium">
                              {booking.customerLocation || "Standard client address"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex lg:flex-col items-end lg:items-center justify-between lg:justify-center gap-3 lg:w-52 lg:border-l lg:border-slate-800 lg:pl-6">
                        <div className="lg:text-center w-full mb-1">
                          <span className="block text-[10px] text-slate-500 uppercase font-bold">
                            Total Payout
                          </span>
                          <span className="block text-2xl font-black text-amber-400">
                            {formatMoney(totalPayout)}
                          </span>
                          <span className="block text-[10px] text-slate-500 uppercase font-bold">
                            Payment: {booking.paymentStatus || "pending"}
                          </span>
                        </div>

                        {booking.status === "pending" && (
                          <div className="flex flex-col gap-2 w-full">
                            <button
                              disabled={updatingBooking === booking.id}
                              onClick={() => handleUpdateBookingStatus(booking.id, "accepted")}
                              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-md shadow-blue-500/20"
                            >
                              Accept Job
                            </button>
                            <button
                              disabled={updatingBooking === booking.id}
                              onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                              className="w-full bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 font-bold py-2 rounded-xl text-xs transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {booking.status === "accepted" && (
                          <button
                            disabled={updatingBooking === booking.id}
                            onClick={() => handleUpdateBookingStatus(booking.id, "completed")}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-emerald-500/20"
                          >
                            Mark Completed
                          </button>
                        )}

                        {booking.status === "completed" && (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                            ✓ Job Completed
                          </span>
                        )}

                        {booking.status === "cancelled" && (
                          <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl">
                            ✕ Job Cancelled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customize Rate / Add Offering Modal */}
      <Modal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        title={offerings.some(o => o.serviceId === selectedService?.id) ? `Edit Rate: ${selectedService?.serviceName || "Service"}` : `Set Rate for ${selectedService?.serviceName || "Service"}`}
      >
        <form onSubmit={handleSaveRate} className="space-y-4">
          <div className="rounded-xl bg-slate-950/60 p-4 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-500">Service</span>
              <strong className="text-sm text-white">{selectedService?.serviceName}</strong>
            </div>
            <div className="text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Catalog Base</span>
              <strong className="text-sm text-amber-400">
                {selectedService ? formatMoney(selectedService.basePrice) : "—"}
              </strong>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your Custom Rate (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={input}
              placeholder={`Default is ${selectedService ? formatMoney(selectedService.basePrice) : "base rate"}`}
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Leave blank to charge the standard catalog base price.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Service Description & Notes (Optional)
            </label>
            <textarea
              rows={3}
              className={input}
              placeholder="E.g. Includes inspection, standard warranty, high-grade tools..."
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRateModalOpen(false)}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingRate}
              className={btnPrimary}
            >
              {savingRate ? "Saving..." : "Save Rate"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create New Master Service Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Service Offering"
      >
        <form onSubmit={handleCreateNewService} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Service Name
            </label>
            <input
              required
              type="text"
              className={input}
              placeholder="E.g. Chimney Cleaning, Solar Panel Repair, Sofa Shampooing..."
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Standard Base Price (₹)
            </label>
            <input
              required
              type="number"
              min="1"
              step="0.01"
              className={input}
              placeholder="E.g. 350"
              value={newServicePrice}
              onChange={(e) => setNewServicePrice(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              rows={3}
              className={input}
              placeholder="Describe what is covered under this service..."
              value={newServiceDesc}
              onChange={(e) => setNewServiceDesc(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="autoAdd"
              type="checkbox"
              checked={autoAddToOfferings}
              onChange={(e) => setAutoAddToOfferings(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="autoAdd" className="text-xs text-slate-300 font-medium">
              Immediately list this new service under my active profile offerings
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className={btnSecondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingService}
              className={btnPrimary}
            >
              {creatingService ? "Creating..." : "Create Service"}
            </button>
          </div>
        </form>
      </Modal>

      <Footer />
    </div>
  );
}
