import { useState } from "react";

export default function Stars({ value = 0, onChange = null, size = "text-sm", className = "" }) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayRating = hoverValue > 0 ? hoverValue : value;
  const rounded = Math.round(displayRating);
  const isEditable = Boolean(onChange);

  return (
    <span className={`inline-flex items-center gap-1 ${size} ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const filled = starIndex <= rounded;
        return (
          <button
            key={starIndex}
            type={isEditable ? "button" : undefined}
            disabled={!isEditable}
            onClick={() => isEditable && onChange(starIndex)}
            onMouseEnter={() => isEditable && setHoverValue(starIndex)}
            onMouseLeave={() => isEditable && setHoverValue(0)}
            className={`transition-all duration-150 ${
              isEditable ? "cursor-pointer hover:scale-125 focus:outline-none" : "cursor-default"
            } ${filled ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "text-slate-700"}`}
          >
            <svg
              className="w-[1.15em] h-[1.15em] fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </button>
        );
      })}
    </span>
  );
}
