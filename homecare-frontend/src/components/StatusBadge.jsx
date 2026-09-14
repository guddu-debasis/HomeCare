const TONES = {
  pending: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  confirmed: "bg-blue-500/15 border-blue-500/30 text-blue-300",
  accepted: "bg-blue-500/15 border-blue-500/30 text-blue-300",
  completed: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  cancelled: "bg-red-500/15 border-red-500/30 text-red-300",
  paid: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  failed: "bg-red-500/15 border-red-500/30 text-red-300",
  refunded: "bg-slate-700/50 border-slate-600/30 text-slate-300",
};

export default function StatusBadge({ status }) {
  const normStatus = (status || "pending").toLowerCase();
  const tone = TONES[normStatus] || "bg-slate-700/50 border-slate-600/30 text-slate-300";
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {normStatus}
    </span>
  );
}
