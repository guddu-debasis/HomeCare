// Shared, crisp geometric SVG icon set — used everywhere the app needs a
// small icon instead of an emoji. Emoji render inconsistently across OSes
// (different art style per platform, can look cartoonish next to the rest
// of the UI) and can't be recolored/sized to match the design system; these
// are plain stroked paths that inherit `currentColor`, so they always match
// whatever text color surrounds them.
export function TradeIcon({ type, className = "w-5 h-5" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (type) {
    case "all":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
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
    case "solar":
      return (
        <svg {...common}>
          <circle cx="12" cy="4.5" r="2.5" />
          <path d="M12 1v1M4.93 3.93l.8.8M1 12h1M19.07 3.93l-.8.8M23 12h-1" />
          <path d="M4 14l3 7h10l3-7H4z" />
          <path d="M9 14l1.2 7M15 14l-1.2 7M5.5 17.5h13" />
        </svg>
      );
    case "care":
      return (
        <svg {...common}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          <path d="M12 7.5v3.5M10.25 9.25h3.5" strokeWidth="1.6" />
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
    case "link":
      return (
        <svg {...common}>
          <path d="M9 15l6-6" />
          <path d="M8 12.5L5.5 15a3 3 0 004.24 4.24L12 17" />
          <path d="M16 11.5L18.5 9a3 3 0 00-4.24-4.24L12 7" />
        </svg>
      );
    case "id":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M6.5 16c.5-1.8 2-2.5 2.5-2.5s2 .7 2.5 2.5" />
          <path d="M14.5 9.5h4M14.5 13h4" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 8L12 3 3 8l9 5 9-5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
          <path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15z" />
          <path d="M5 15l.6 1.8L7.5 17.5l-1.9.7L5 20l-.6-1.8L2.5 17.5l1.9-.7L5 15z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "check-circle":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 12.3l2.3 2.3 4.7-4.9" />
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

// Keyword → icon-type mapping, shared so every page agrees on which icon
// represents "plumbing", "AC", etc. instead of each page guessing its own.
const SERVICE_ICON_TYPES = {
  ac: "ac",
  cool: "ac",
  air: "ac",
  solar: "solar",
  sun: "solar",
  energy: "solar",
  baby: "care",
  care: "care",
  elderly: "care",
  nurse: "care",
  nursing: "care",
  patient: "care",
  clean: "clean",
  plumb: "plumb",
  pipe: "plumb",
  water: "plumb",
  electr: "electr",
  wire: "electr",
  paint: "paint",
  carpent: "carpent",
  pest: "pest",
  appliance: "appliance",
  tv: "appliance",
};

export const getServiceIconType = (name = "") => {
  const lower = name.toLowerCase();
  for (const [key, type] of Object.entries(SERVICE_ICON_TYPES)) {
    if (lower.includes(key)) return type;
  }
  return "tool";
};
