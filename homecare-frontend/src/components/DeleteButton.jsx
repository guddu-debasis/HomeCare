// Reusable delete/remove button — used anywhere an item can be removed
// (service catalog, seller offerings, cart items). Icon-only on very small
// screens to save space, icon+label from `sm` up. Sized for touch.
export default function DeleteButton({ onClick, label = "Remove", disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-medium text-brick transition-colors hover:border-brick/30 hover:bg-brick-light disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
