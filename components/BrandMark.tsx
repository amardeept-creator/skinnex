export function BrandMark({ name, accent, logo, size = 44 }: { name: string; accent: string; logo?: string | null; size?: number }) {
  if (logo) return <img src={logo} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: size * 0.32, objectFit: 'cover', flex: 'none', background: '#fff' }} />;
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return <span className="monogram" style={{ width: size, height: size, borderRadius: size * 0.32, background: accent, fontSize: size * 0.38 }} aria-hidden="true">{initials}</span>;
}
