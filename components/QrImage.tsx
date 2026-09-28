/* Server-rendered QR (SVG) for a Skinner slug. */
export function QrImage({ slug, size = 160, src = 'qr' }: { slug: string; size?: number; src?: string }) {
  return <img src={`/api/qr/${slug}?format=svg&src=${src}`} width={size} height={size} alt="QR code to open this Skinner on your phone" style={{ width: size, height: size, borderRadius: 12, background: '#fff' }} />;
}
