export default function Logo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="amberBody" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f8dfa0" />
          <stop offset="48%" stopColor="#e0a53f" />
          <stop offset="100%" stopColor="#8a5a1c" />
        </linearGradient>
        <linearGradient id="amberHighlight" x1="8" y1="3" x2="17" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points="16,2 27,9 27,23 16,30 5,23 5,9"
        fill="url(#amberBody)"
        stroke="#5b3a12"
        strokeOpacity="0.35"
        strokeWidth="0.75"
      />
      <path
        d="M16 2 L16 30 M5 9 L27 23 M5 23 L27 9"
        stroke="#5b3a12"
        strokeOpacity="0.22"
        strokeWidth="0.6"
        fill="none"
      />
      <polygon points="16,2 22,6 16,11.5 9,7" fill="url(#amberHighlight)" />
      <g stroke="#fff6e3" strokeOpacity="0.9" strokeWidth="0.9" fill="#fff6e3">
        <line x1="12" y1="19.5" x2="16" y2="16.5" strokeOpacity="0.75" />
        <line x1="16" y1="16.5" x2="20.5" y2="20" strokeOpacity="0.75" />
        <circle cx="12" cy="19.5" r="1.3" />
        <circle cx="16" cy="16.5" r="1.5" />
        <circle cx="20.5" cy="20" r="1.3" />
      </g>
    </svg>
  );
}
