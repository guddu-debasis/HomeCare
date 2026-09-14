const TONES = {
  pending: "bg-ochre-light text-ochre-dark",
  accepted: "bg-pine-light text-pine-dark",
  completed: "bg-pine text-white",
  cancelled: "bg-brick-light text-brick",
  paid: "bg-pine-light text-pine-dark",
  failed: "bg-brick-light text-brick",
  refunded: "bg-ink-faint/20 text-ink-soft",
};

export default function StatusBadge({ status }) {
  const tone = TONES[status] || "bg-ink-faint/20 text-ink-soft";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}
