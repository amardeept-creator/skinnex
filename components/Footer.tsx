import Link from 'next/link';
import { Logo } from './Logo';
export function Footer() {
  return (
    <footer className="footer">
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32 }}>
        <div className="stack" style={{ gap: 14 }}>
          <Logo />
          <p className="small muted" style={{ maxWidth: 260 }}>See it. Try it. Love it. Real-time AR try-on for products you love.</p>
        </div>
        <div className="stack" style={{ gap: 10 }}><div className="eyebrow">Discover</div><Link href="/explore">Explore</Link><Link href="/categories">Categories</Link><Link href="/explore?sort=new">New Skinners</Link><Link href="/saved">Saved</Link></div>
        <div className="stack" style={{ gap: 10 }}><div className="eyebrow">For brands</div><Link href="/brands">Why SKINIFY</Link><Link href="/pricing">Pricing</Link><Link href="/signup">Create a Skinner</Link><Link href="/developers">SDK &amp; API</Link></div>
        <div className="stack" style={{ gap: 10 }}><div className="eyebrow">Trust</div><Link href="/privacy">Camera privacy</Link><Link href="/how-it-works">How AR works</Link><Link href="/login">Seller sign in</Link></div>
      </div>
      <div className="container tiny faint" style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        <span>© {new Date().getFullYear()} SKINIFY. Camera processing happens on your device.</span>
        <span>Catalogue brands marked “Demo” are sample brands for evaluation — they are not real stores.</span>
      </div>
    </footer>
  );
}
