import Link from 'next/link';
import { Logo } from '@/components/Logo';
export default function NotFound() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div className="stack" style={{ alignItems: 'center', gap: 14, maxWidth: 440 }}>
        <Link href="/"><Logo /></Link>
        <h1 style={{ fontSize: 'clamp(32px,6vw,52px)' }}>Nothing to try on here</h1>
        <p className="muted">This page doesn’t exist, or the product was removed by its brand.</p>
        <div className="row" style={{ gap: 8 }}><Link href="/explore" className="btn btn-primary">Explore Skinners</Link><Link href="/" className="btn btn-ghost">Home</Link></div>
      </div>
    </main>
  );
}
