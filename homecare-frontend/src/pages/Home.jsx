import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { servicesApi, sellerServicesApi, cartApi } from "../lib/api";
import { formatMoney } from "../lib/format";
import { btnPrimary, btnSecondary } from "../lib/ui";
import Modal from "../components/Modal";
import Footer from "../components/Footer";
import AiSearchPanel from "../components/AiSearchPanel";

// ---------------------------------------------------------------------
// A small custom icon set instead of raw emoji. Emoji render differently
// per OS/browser and read as a placeholder rather than a designed mark —
// these are plain geometric line icons in one consistent stroke weight,
// built from the actual tools/objects of each trade rather than a generic
// symbol library.
// ---------------------------------------------------------------------
function TradeIcon({ type, className = "w-5 h-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (type) {
    case "all":
      return (
        <svg {...common}>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" />
        </svg>
      );
    case "clean":
      return (
        <svg {...common}>
          <path d="M6 10h12l-1.4 8.2a2 2 0 01-2 1.8H9.4a2 2 0 01-2-1.8L6 10z" />
          <path d="M9 10V7a3 3 0 016 0v3" />
          <path d="M9.5 13.5h5" />
        </svg>
      );
    case "plumb":
      return (
        <svg {...common}>
          <path d="M7 4v6a3 3 0 003 3h4" />
          <circle cx="7" cy="4" r="1.6" />
          <circle cx="17" cy="16" r="3.4" />
          <path d="M17 13.6V10" />
        </svg>
      );
    case "electr":
      return (
        <svg {...common}>
          <path d="M13 2 5 14h5l-1 8 8-12h-5l1-8z" />
        </svg>
      );
    case "ac":
      return (
        <svg {...common}>
          <path d="M12 3v18M4 7.5l16 9M20 7.5l-16 9" />
          <path d="M12 3l-1.8 1.8M12 3l1.8 1.8M12 21l-1.8-1.8M12 21l1.8-1.8" />
          <path d="M4 7.5l1.2 2.4M4 7.5l2.4-1.2M20 16.5l-1.2-2.4M20 16.5l-2.4 1.2" />
        </svg>
      );
    case "carpent":
      return (
        <svg {...common}>
          <path d="M3 17l7-7" />
          <path d="M9 9l2.5-2.5a2 2 0 012.8 0l1.2 1.2a2 2 0 010 2.8L13 13" />
          <path d="M13 13l6.5 6.5" />
          <path d="M3 17l1.8 1.8" />
        </svg>
      );
    case "paint":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="10" height="6" rx="1.2" />
          <path d="M9 10v3a2 2 0 002 2h1a2 2 0 012 2v3" />
          <circle cx="14" cy="19" r="1.4" />
        </svg>
      );
    case "appliance":
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="1.6" />
          <circle cx="12" cy="13" r="4.2" />
          <path d="M8 6.2h1M11.5 6.2h1" />
        </svg>
      );
    case "pest":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="13" rx="4" ry="5.5" />
          <path d="M12 7.5V5M9.5 5.8L8 4M14.5 5.8L16 4" />
          <path d="M8.2 11h-3M8.2 14h-3M8.2 17h-3M15.8 11h3M15.8 14h3M15.8 17h3" />
        </svg>
      );
    case "clipboard":
      return (
        <svg {...common}>
          <rect x="5.5" y="4.5" width="13" height="16" rx="1.6" />
          <path d="M9 4.5V3.8a1.3 1.3 0 011.3-1.3h3.4A1.3 1.3 0 0115 3.8v.7" />
          <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="14.5" rx="1.6" />
          <path d="M4 10h16M8 3.5v3M16 3.5v3" />
          <path d="M8.5 14.2h.01M12 14.2h.01M15.5 14.2h.01" />
        </svg>
      );
    case "toolbox":
      return (
        <svg {...common}>
          <rect x="3.5" y="9" width="17" height="10" rx="1.6" />
          <path d="M8.5 9V6.8a1.6 1.6 0 011.6-1.6h3.8a1.6 1.6 0 011.6 1.6V9" />
          <path d="M3.5 13.5h17" />
          <path d="M10.7 13.5v1.8h2.6v-1.8" />
        </svg>
      );
    case "check-shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5.5c0 4.6-3 7.6-7 9.5-4-1.9-7-4.9-7-9.5V6l7-3z" />
          <path d="M9 12.3l2 2 4-4.3" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5.5c0 4.6-3 7.6-7 9.5-4-1.9-7-4.9-7-9.5V6l7-3z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M11.5 4H5.5A1.5 1.5 0 004 5.5v6l9 9 7.5-7.5-9-9z" />
          <circle cx="8.2" cy="8.2" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 0113.7-5.7L20 8" />
          <path d="M20 4v4h-4" />
          <path d="M20 12a8 8 0 01-13.7 5.7L4 16" />
          <path d="M4 20v-4h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M8.5 3.5L12 7l-4.5 4.5L4 8l4.5-4.5z" />
          <path d="M10 9l8 8" />
          <circle cx="19" cy="19" r="1.8" />
        </svg>
      );
  }
}

const CATEGORIES = [
  { id: "all", label: "All Services", iconType: "all" },
  { id: "cleaning", label: "Deep Cleaning", iconType: "clean", keywords: ["clean"] },
  { id: "plumbing", label: "Plumbing", iconType: "plumb", keywords: ["plumb", "pipe", "drain", "leak"] },
  { id: "electrical", label: "Electrical", iconType: "electr", keywords: ["electr", "wire", "switch"] },
  { id: "ac", label: "AC & Cooling", iconType: "ac", keywords: ["ac", "cool", "air"] },
  { id: "carpentry", label: "Carpentry", iconType: "carpent", keywords: ["carpent", "wood", "furnitur"] },
  { id: "painting", label: "Painting", iconType: "paint", keywords: ["paint", "wall", "proof"] },
  { id: "appliances", label: "Appliance Repair", iconType: "appliance", keywords: ["appliance", "tv", "wash", "refrig"] },
  { id: "pest", label: "Pest Control", iconType: "pest", keywords: ["pest", "termite"] },
];

const SERVICE_BENEFITS = {
  plumb: ["Leakage inspection & diagnosis", "Pipe & faucet replacement", "Pressure testing & drain unblocking", "30-day post-service warranty"],
  clean: ["Eco-friendly hospital-grade sanitizers", "Full kitchen & bathroom degreasing", "Dust mite & upholstery deep vacuum", "Post-cleaning walk-through guarantee"],
  electr: ["Certified licensed technicians", "Shock-proof fuse & wiring fixes", "Appliance connection & testing", "Compliance with electrical safety codes"],
  ac: ["Deep filter & condenser coil cleaning", "Gas level check & leak diagnosis", "Cooling performance benchmark", "Standard 30-day servicing warranty"],
  paint: ["Surface scraping & primer basecoat", "Zero-VOC odorless wall emulsions", "Furniture masking & protection", "Spotless post-paint floor cleanup"],
  carpent: ["Lock, hinge & handle fitting", "Precision wood cutting & polishing", "Furniture assembly with warranty", "Genuine hardware supplies provided"],
  appliance: ["Genuine brand spare parts", "Diagnostic testing before repairs", "Transparent parts billing", "90-day parts warranty guarantee"],
  pest: ["Odorless government-approved chemicals", "Safe for kids, elderly & pets", "Complete eradication of nest sources", "Includes follow-up check assurance"],
};

const getBenefits = (serviceName = "") => {
  const lower = serviceName.toLowerCase();
  for (const [key, list] of Object.entries(SERVICE_BENEFITS)) {
    if (lower.includes(key)) return list;
  }
  return [
    "Certified verified specialist",
    "Transparent upfront pricing",
    "Complete safety & quality check",
    "30-day rework guarantee",
  ];
};

const SERVICE_ICON_TYPES = {
  plumb: "plumb",
  clean: "clean",
  electr: "electr",
  ac: "ac",
  paint: "paint",
  carpent: "carpent",
  pest: "pest",
  appliance: "appliance",
  tv: "appliance",
};

const getServiceIconType = (name = "") => {
  const lower = name.toLowerCase();
  for (const [key, type] of Object.entries(SERVICE_ICON_TYPES)) {
    if (lower.includes(key)) return type;
  }
  return "tool";
};

// A category's accent runs down the left edge of its job cards, so the
// catalog reads as a set of distinct trades rather than one uniform stack —
// same structure, different color per row of work.
const CATEGORY_ACCENTS = {
  clean: "border-l-sky-500/70",
  plumb: "border-l-sky-500/70",
  electr: "border-l-amber-400/70",
  ac: "border-l-sky-500/70",
  carpent: "border-l-amber-600/70",
  paint: "border-l-emerald-500/70",
  appliance: "border-l-amber-400/70",
  pest: "border-l-emerald-500/70",
  tool: "border-l-amber-500/70",
};

const FAQ_ITEMS = [
  {
    q: "How are Hearth service professionals vetted and verified?",
    a: "Every specialist on Hearth undergoes strict background checks, government ID verification, and technical skill assessments before being permitted to offer services. We also review customer feedback after every completed booking.",
  },
  {
    q: "Are the prices fixed or are there hidden fees?",
    a: "All service rates displayed are 100% upfront and transparent. You will see the exact pricing before adding any service to your cart. If additional spare parts are needed, the provider will provide an itemized quote before starting.",
  },
  {
    q: "Can I reschedule or cancel my booking?",
    a: "Yes! You can reschedule or cancel pending bookings directly from your 'My Bookings' tab anytime before the provider begins work, with zero penalty.",
  },
  {
    q: "What is Hearth's 30-day satisfaction guarantee?",
    a: "If you encounter any issue or are unsatisfied with the quality of service provided, report it within 30 days and our verified specialist will return to fix it at zero extra cost.",
  },
];

export default function Home() {
  const [services, setServices] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Details / Provider Selection Modal
  const [selectedService, setSelectedService] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [addingServiceId, setAddingServiceId] = useState(null);
  // Tracks the specific provider button being clicked inside the modal
  // (keyed by sellerId, or "base" for the no-provider fallback button) so
  // that clicking one "Book with Pro" button doesn't show every sibling
  // provider's button as loading too.
  const [addingProviderKey, setAddingProviderKey] = useState(null);

  // FAQ open item
  const [openFaq, setOpenFaq] = useState(0);

  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (isAuthenticated && role === "seller") {
      navigate("/seller/services");
      return;
    }

    setLoading(true);
    Promise.all([
      servicesApi.list().catch(() => ({ data: [] })),
      sellerServicesApi.listAll().catch(() => ({ data: [] })),
    ])
      .then(([servicesRes, offeringsRes]) => {
        setServices(servicesRes.data || []);
        setOfferings(offeringsRes.data || []);
      })
      .catch((err) => setError(err.message || "Failed to load services"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, role, navigate]);

  // Filter services by category and search
  const filteredServices = services.filter((s) => {
    const sName = s.serviceName?.toLowerCase() || "";
    const sDesc = s.description?.toLowerCase() || "";
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || sName.includes(q) || sDesc.includes(q);

    if (activeCategory === "all") return matchesSearch;

    const catObj = CATEGORIES.find((c) => c.id === activeCategory);
    const keywords = catObj?.keywords || [activeCategory];
    const matchesCategory = keywords.some((kw) => sName.includes(kw) || sDesc.includes(kw));

    return matchesSearch && matchesCategory;
  });

  // Providers available for a given service
  const getProvidersForService = (serviceId) => {
    return offerings.filter((o) => o.serviceId === serviceId);
  };

  // Add service to cart
  const handleAddToCart = async (service, provider = null) => {
    if (!isAuthenticated) {
      showError("Please log in as a customer to book home services.");
      navigate("/login");
      return;
    }

    if (role !== "customer") {
      showError("Please sign in with a customer account to book home services.");
      return;
    }

    const availableProviders = getProvidersForService(service.id);

    // If multiple providers exist and none was specifically picked, open the modal to pick
    if (!provider && availableProviders.length > 1) {
      setSelectedService(service);
      setIsDetailModalOpen(true);
      return;
    }

    // Determine which provider to use
    const targetProvider = provider || availableProviders[0];

    if (!targetProvider) {
      // Fallback: If no provider mapped yet, show informative message
      showError(`Currently all specialists for "${service.serviceName}" are booked. Please check back shortly!`);
      return;
    }

    setAddingServiceId(service.id);
    setAddingProviderKey(provider ? provider.sellerId : "base");
    try {
      await cartApi.add({
        serviceId: service.id,
        sellerId: targetProvider.sellerId,
        quantity: 1,
      });
      showSuccess(
        <span>
          Added <strong>{service.serviceName}</strong> with pro {targetProvider.sellerName} to your cart.{" "}
          <Link to="/cart" className="underline font-bold text-amber-300 ml-1">
            View cart
          </Link>
        </span>
      );
      if (isDetailModalOpen) setIsDetailModalOpen(false);
    } catch (err) {
      showError(err.message || "Failed to add service to cart.");
    } finally {
      setAddingServiceId(null);
      setAddingProviderKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* 1. TOP HERO SECTION — styled after a work order: what needs doing,
          who's doing it, and the guarantee behind it, rather than a generic
          SaaS hero with a floating stat panel. */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950 pt-16 pb-20 lg:pt-20 lg:pb-28">
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400">
                <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                Background-checked pros, booked in minutes
              </div>

              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[3.4rem] leading-[1.12]">
                Someone you can trust with a key to your front door.
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-slate-300 max-w-xl">
                From an emergency leak at midnight to a long-overdue deep clean, Hearth connects you with verified local tradespeople — priced upfront, backed by a 30-day rework guarantee.
              </p>

              {/* Search Bar */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-xl border border-slate-800 bg-slate-900 shadow-lg">
                  <div className="relative flex-1 flex items-center">
                    <svg
                      className="w-5 h-5 text-amber-400 absolute left-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="What needs doing? Try 'leaking tap' or 'AC service'"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent pl-12 pr-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <a
                    href="#services-catalog"
                    className="rounded-lg bg-amber-500 px-6 py-3 text-xs font-bold text-white hover:bg-amber-400 transition-colors text-center flex items-center justify-center gap-1.5"
                  >
                    See services
                  </a>
                </div>
              </div>

              {/* Quick Tags */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-medium">Common jobs:</span>
                {CATEGORIES.filter((c) => c.id !== "all").slice(0, 5).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      const el = document.getElementById("services-catalog");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:border-amber-500/40 hover:text-white transition-all"
                  >
                    <TradeIcon type={cat.iconType} className="w-3.5 h-3.5 text-amber-400" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hero Right: a job-ticket styled trust card — dashed
                "tear line" and a serial number, echoing an actual work
                order instead of a glossy SaaS stat panel. */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-dashed border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                      <TradeIcon type="check-shield" className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold font-display text-white">The Hearth Standard</h3>
                      <p className="text-[11px] text-slate-500">Every booking, no exceptions</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-600">No. HC-001</span>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {[
                    {
                      title: "Background-checked specialists",
                      desc: "ID verified, trade licensed, and skill-assessed before they're allowed to take a job.",
                    },
                    {
                      title: "Upfront, honest pricing",
                      desc: "You see the rate before you book. No surprise call-out fee at the door.",
                    },
                    {
                      title: "30-day rework warranty",
                      desc: "Not happy with the job? We send someone back to fix it, at no extra cost.",
                    },
                  ].map((item, idx) => (
                    <div key={item.title} className="flex items-start gap-3.5 px-6 py-4">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/40 text-[10px] font-bold text-amber-400">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 border-t border-dashed border-slate-700 text-center">
                  <div className="p-3 border-r border-slate-800">
                    <div className="text-base font-extrabold text-white">4.9★</div>
                    <div className="text-[10px] text-slate-500">Avg. rating</div>
                  </div>
                  <div className="p-3 border-r border-slate-800">
                    <div className="text-base font-extrabold text-amber-400">15 min</div>
                    <div className="text-[10px] text-slate-500">Avg. response</div>
                  </div>
                  <div className="p-3">
                    <div className="text-base font-extrabold text-emerald-400">100%</div>
                    <div className="text-[10px] text-slate-500">Vetted & insured</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1.5. AI SEARCH — distinct from the plain keyword filter above:
          natural-language query, ranked by an LLM over real approved
          listings only, never a substitute for browsing the catalog. */}
      <AiSearchPanel />

      {/* 2. CATEGORY FILTER BAR */}
      <section id="services-catalog" className="sticky top-[65px] z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-lg py-4">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                    isActive
                      ? "bg-amber-500 text-white border-amber-500 font-bold"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <TradeIcon type={cat.iconType} className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. MAIN SERVICES CATALOG GRID — cards styled like job tickets: a
          colored trade edge, a dashed perforation before the price/action
          row, mixed radius rather than one bubble-rounded shape repeated. */}
      <section className="mx-auto max-w-7xl px-6 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              Book a service
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {filteredServices.length} {filteredServices.length === 1 ? "service" : "services"} available, handled by vetted specialists with guaranteed parts.
            </p>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-72 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-300 text-center">
            {error}
          </div>
        )}

        {/* Empty Search / Filter */}
        {!loading && !error && filteredServices.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-16 text-center space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400">
              <TradeIcon type="all" className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">No services found</h3>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? `Nothing matches "${searchQuery}" in this category.`
                : "Nothing is listed in this category right now."}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className={btnSecondary}
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Services Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const providers = getProvidersForService(service.id);
            const benefits = getBenefits(service.serviceName);
            const iconType = getServiceIconType(service.serviceName);
            const accentClass = CATEGORY_ACCENTS[iconType] || CATEGORY_ACCENTS.tool;

            // If a provider customized price, show starting price or lowest price
            const lowestCustom = providers.length
              ? Math.min(...providers.map((p) => Number(p.customPrice || service.basePrice)))
              : Number(service.basePrice);

            const displayPrice = lowestCustom || Number(service.basePrice);

            return (
              <div
                key={service.id}
                className={`group flex flex-col justify-between rounded-xl border border-l-4 ${accentClass} border-slate-800 bg-slate-900/50 transition-all duration-200 hover:border-slate-700 hover:-translate-y-1`}
              >
                <div className="p-6 space-y-4">
                  {/* Card Header: Icon & Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/80 text-amber-400">
                      <TradeIcon type={iconType} className="w-5 h-5" />
                    </div>

                    {providers.length > 0 ? (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        {providers.length} {providers.length === 1 ? "pro nearby" : "pros nearby"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                        Certified service
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-display text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                      {service.serviceName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {service.description ||
                        "Standard professional certified home care service provided by registered Hearth specialists."}
                    </p>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-1.5 pt-1">
                    {benefits.slice(0, 3).map((b, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                        <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="truncate">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Price & Book Button, separated by a dashed
                    perforation like a tear-off job ticket */}
                <div className="mt-2 border-t border-dashed border-slate-700 px-6 py-4 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block">
                      Starting from
                    </span>
                    <span className="text-xl font-extrabold text-amber-400">
                      {formatMoney(displayPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedService(service);
                        setIsDetailModalOpen(true);
                      }}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                      title="View service inclusions and details"
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      disabled={addingServiceId === service.id}
                      onClick={() => handleAddToCart(service)}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-400 transition-all disabled:opacity-50"
                    >
                      {addingServiceId === service.id ? "Adding…" : "Book now"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. HOW HEARTH WORKS — a connected path rather than four identical
          cards, since this content really is a sequence. */}
      <section className="border-t border-slate-800 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <div className="max-w-xl space-y-2">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
              How it works
            </h2>
            <p className="text-sm text-slate-400">
              Four steps from "I need this fixed" to a finished job you're happy with.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-slate-800" />
            {[
              { icon: "clipboard", title: "Choose your service", desc: "Browse the catalog with upfront rates and clear inclusions." },
              { icon: "calendar", title: "Pick a date", desc: "Choose an exact date and a time window that fits your day." },
              { icon: "toolbox", title: "Your pro arrives", desc: "A background-checked specialist shows up with genuine parts." },
              { icon: "check-shield", title: "Job done, guaranteed", desc: "Inspect the work, backed by our 30-day rework warranty." },
            ].map((s, idx) => (
              <div key={s.title} className="relative space-y-3">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 border-2 border-amber-500/60 text-amber-400">
                  <TradeIcon type={s.icon} className="w-5 h-5" />
                </div>
                <h3 className="font-display text-base font-bold text-white">
                  {idx + 1}. {s.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE HEARTH — an inline checklist rather than three
          identical bordered boxes. */}
      <section className="border-t border-slate-800 bg-slate-950 py-20">
        <div className="mx-auto max-w-5xl px-6 space-y-10">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white max-w-lg">
            Why homeowners stick with Hearth
          </h2>

          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {[
              {
                icon: "shield",
                title: "100% verified specialists",
                desc: "No random strangers. Every technician passes identity verification, background checks, and a trade skill assessment before joining.",
              },
              {
                icon: "tag",
                title: "Upfront, transparent rates",
                desc: "No hidden call-out fees or doorstep surcharges. You see the certified rate before you confirm a booking.",
              },
              {
                icon: "refresh",
                title: "30-day satisfaction warranty",
                desc: "If a job doesn't meet expectations, we send the specialist back to make it right — at zero extra cost.",
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col sm:flex-row gap-5 py-8">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <TradeIcon type={item.icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display text-white">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mt-1 max-w-xl">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CUSTOMER REVIEWS */}
      <section className="border-t border-slate-800 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-7xl px-6 space-y-12">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white max-w-lg">
            Trusted by 5,000+ homes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Priya Sharma",
                service: "Deep Home Cleaning",
                review: "Booked a full house deep clean before our family celebration. The team arrived on time, was extremely polite, and left every tile and window shining!",
                rating: 5,
                tag: "Verified booking",
              },
              {
                name: "Rahul Mehra",
                service: "Plumbing & Pipe Repair",
                review: "Had a severe water pipe leak under the kitchen sink. The certified plumber arrived within 45 minutes, replaced the damaged valve, and tested everything thoroughly.",
                rating: 5,
                tag: "Emergency repair",
              },
              {
                name: "Ananya Sen",
                service: "AC Repair & Servicing",
                review: "Transparent pricing with zero hidden charges. The technician cleaned the cooling coils and refilled the refrigerant. The AC works like brand new now.",
                rating: 5,
                tag: "Verified booking",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <svg className="w-6 h-6 text-amber-500/40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.5 6C6.5 7.5 5 10 5 13c0 2.5 1.5 4 3.5 4S12 15.5 12 13c0-2-1.2-3.3-3-3.4.4-1.3 1.5-2.4 3-3.1L9.5 6zm9 0c-3 1.5-4.5 4-4.5 7 0 2.5 1.5 4 3.5 4s3.5-1.5 3.5-4c0-2-1.2-3.3-3-3.4.4-1.3 1.5-2.4 3-3.1L18.5 6z" />
                  </svg>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t.review}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{t.name}</h4>
                      <p className="text-[10px] text-slate-500">{t.service}</p>
                    </div>
                  </div>
                  <div className="flex text-amber-400 text-xs">{"★".repeat(t.rating)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="border-t border-slate-800 bg-slate-950 py-20">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            Questions, answered
          </h2>

          <div className="divide-y divide-slate-800 border-y border-slate-800">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left text-sm font-bold text-slate-200 hover:text-white"
                  >
                    <span>{item.q}</span>
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-amber-400 text-sm">
                      {isOpen ? "–" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="pb-5 text-xs text-slate-400 leading-relaxed max-w-xl">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION FOOTER BANNER */}
      <section className="border-t border-slate-800 bg-amber-600 py-14 text-white">
        <div className="mx-auto max-w-7xl px-6 text-center space-y-4">
          <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight">
            Ready to give your home the care it deserves?
          </h2>
          <p className="text-sm sm:text-base font-medium max-w-xl mx-auto opacity-90">
            Book a certified specialist in under a minute, with transparent pricing and a 30-day rework warranty.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#services-catalog"
              className="rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-amber-400 hover:bg-slate-900 transition-colors"
            >
              Browse services
            </a>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="rounded-lg bg-white/15 hover:bg-white/25 px-6 py-3 text-sm font-bold text-white transition-colors"
              >
                Create free account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 9. SERVICE DETAILS & PROVIDER SELECTION MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedService?.serviceName || "Service Details"}
      >
        {selectedService && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="rounded-lg bg-slate-950/70 p-4 border border-slate-800 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <TradeIcon type={getServiceIconType(selectedService.serviceName)} className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-base text-white">{selectedService.serviceName}</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {selectedService.description || "Standard certified home care coverage."}
                </p>
                <div className="mt-2 text-xs font-semibold text-amber-400">
                  Standard catalog base: {formatMoney(selectedService.basePrice)}
                </div>
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300">
                What's included
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getBenefits(selectedService.serviceName).map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Verified Specialists */}
            <div className="space-y-2 pt-2 border-t border-dashed border-slate-700">
              <h5 className="text-xs font-bold text-slate-300">
                Available specialists
              </h5>

              {getProvidersForService(selectedService.id).length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-300">
                    We'll automatically assign an available verified specialist for this booking at checkout.
                  </p>
                  <button
                    type="button"
                    disabled={addingProviderKey === "base"}
                    onClick={() => handleAddToCart(selectedService)}
                    className={`${btnPrimary} w-full py-2.5 text-xs`}
                  >
                    {addingProviderKey === "base" ? "Adding…" : "Add to cart at base price"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {getProvidersForService(selectedService.id).map((prov) => (
                    <div
                      key={prov.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 font-bold text-sm">
                          {prov.sellerName ? prov.sellerName[0].toUpperCase() : "P"}
                        </div>
                        <div>
                          <h6 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{prov.sellerName}</span>
                            <span className="text-[10px] text-emerald-400 font-normal">● Certified</span>
                          </h6>
                          <span className="text-[11px] font-extrabold text-amber-400">
                            {formatMoney(prov.customPrice || prov.basePrice)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={addingProviderKey === prov.sellerId}
                        onClick={() => handleAddToCart(selectedService, prov)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-400 transition-colors disabled:opacity-50"
                      >
                        {addingProviderKey === prov.sellerId ? "Adding…" : "Book with pro"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className={btnSecondary}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Footer />
    </div>
  );
}
