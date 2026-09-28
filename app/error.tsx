'use client';
import Link from 'next/link';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ minHeight: '70dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div className="stack" style={{ alignItems: 'center', gap: 14, maxWidth: 440 }}>
        <h1 style={{ fontSize: 36 }}>Something went wrong</h1>
        <p className="muted">We couldn’t load this page. It may be a network problem — please try again.</p>
        <div className="row" style={{ gap: 8 }}><button className="btn btn-primary" onClick={reset}>Try again</button><Link href="/" className="btn btn-ghost">Home</Link></div>
      </div>
    </main>
  );
}
