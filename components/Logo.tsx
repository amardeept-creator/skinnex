export function LogoMark({ size = 28 }: { size?: number }) {
  // A camera lens whose inner curve reads as an "S" — with a tracking anchor dot.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="10" fill="currentColor" />
      <circle cx="16" cy="16" r="8.2" stroke="#fff" strokeWidth="2.4" opacity="0.95" />
      <path d="M19.2 12.6c-.9-1-2-1.5-3.3-1.5-1.8 0-3.1 1-3.1 2.4 0 3.2 6.5 1.8 6.5 5 0 1.5-1.4 2.5-3.3 2.5-1.4 0-2.7-.6-3.5-1.7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24.6" cy="7.4" r="2.6" fill="#F19BBD" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
export function Logo({ size = 28 }: { size?: number }) {
  return <span className="logo" aria-label="SKINIFY"><LogoMark size={size} /><span>SKINIFY</span></span>;
}
