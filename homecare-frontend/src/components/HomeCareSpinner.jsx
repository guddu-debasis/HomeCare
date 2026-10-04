import React from "react";

/**
 * 4-color segmented circular loader matching the user's reference:
 * - Red segment (top): #EA4335
 * - Green segment (right): #34A853
 * - Yellow segment (bottom): #FBBC05
 * - Navy / Royal blue segment (left): #1E3A8A
 * with rounded pill ends, balanced arc segments, and smooth continuous rotation.
 */
export default function HomeCareSpinner({
  size = "md",
  label = "",
  className = "",
  fullScreen = false,
}) {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  const spinnerDimensions = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 64 64"
          className={`${spinnerDimensions} animate-spin`}
          style={{ animationDuration: "1.1s" }}
        >
          {/* Red arc (top) */}
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke="#EA4335"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="18 107.66"
            strokeDashoffset="0"
          />
          {/* Green arc (right) */}
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke="#34A853"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="18 107.66"
            strokeDashoffset="-31.41"
          />
          {/* Yellow arc (bottom) */}
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke="#FBBC05"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="18 107.66"
            strokeDashoffset="-62.83"
          />
          {/* Royal Blue / Navy arc (left) */}
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="none"
            stroke="#1E3A8A"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray="18 107.66"
            strokeDashoffset="-94.24"
          />
        </svg>
      </div>
      {label && (
        <span className="text-xs font-semibold tracking-wide text-slate-300 dark:text-slate-400 animate-pulse text-center">
          {label}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}
