import Link from 'next/link';
import { Logo } from '@/components/Logo';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))' }}>
      <div style={{ padding: 'clamp(24px, 5vw, 56px)', display: 'flex', flexDirection: 'column' }}>
        <Link href="/"><Logo /></Link>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '32px 0' }}><div style={{ width: 'min(400px, 100%)' }}>{children}</div></div>
      </div>
      <div className="hide-md" style={{ background: 'radial-gradient(60% 60% at 30% 30%, #3a2a7a, transparent 70%), radial-gradient(50% 60% at 80% 80%, #6a2a4d, transparent 70%), #141118', color: '#fff', padding: 56, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16 }}>
        <img src="/seed/img/ring-solitaire-1.webp" alt="" style={{ width: '60%', margin: '0 auto', filter: 'drop-shadow(0 30px 60px rgba(0,0,0,.5))' }} />
        <h2 style={{ fontSize: 48 }}>Create once.<br />Share anywhere.</h2>
        <p style={{ opacity: .7, maxWidth: 420 }}>Turn products into AR try-on experiences your customers open from any link.</p>
      </div>
    </div>
  );
}
