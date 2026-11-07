// A simple emblem: a gold disc with Mt. Halcon above the sea. Replace with the official seal when you have it.
export function Seal({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Province of Oriental Mindoro" className="seal">
      <circle cx="24" cy="24" r="23" fill="#C8962E" />
      <circle cx="24" cy="24" r="19" fill="#17304A" />
      <path d="M9 30 L19 14 L24 22 L29 16 L39 30 Z" fill="#F6EBCF" />
      <path d="M9 34 Q13.5 31 18 34 T27 34 T36 34 T39 33.5" stroke="#1B7A93" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M11 39 Q15.5 36 20 39 T29 39 T37 38.5" stroke="#1B7A93" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
