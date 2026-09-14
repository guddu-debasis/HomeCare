export default function Stars({ value = 0, size = "text-sm" }) {
  const rounded = Math.round(value);
  return (
    <span className={`inline-flex gap-0.5 ${size}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "text-ochre" : "text-ink-faint/40"}>
          ★
        </span>
      ))}
    </span>
  );
}
