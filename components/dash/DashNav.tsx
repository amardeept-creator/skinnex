'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { BrandMark } from '@/components/BrandMark';
import { I } from '@/components/Icons';

const NAV = [
  ['/dashboard', 'Overview', I.home], ['/dashboard/skinners', 'My Skinners', I.layers], ['/dashboard/skinners/new', 'Create Skinner', I.plus],
  ['/dashboard/analytics', 'Analytics', I.chart], ['/dashboard/links', 'Links & QR', I.link], ['/dashboard/assets', '3D assets', I.cube],
  ['/dashboard/subscription', 'Subscription', I.card], ['/dashboard/brand', 'Brand settings', I.store], ['/dashboard/account', 'Account', I.settings],
] as const;

export function DashNav({ brand, user, plan }: { brand: { name: string; accent: string; logo: string | null; slug: string }; user: { name: string; email: string; isAdmin: boolean }; plan: string }) {
  const path = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const active = (h: string) => h === '/dashboard' ? path === h : h === '/dashboard/skinners' ? path.startsWith(h) && !path.startsWith('/dashboard/skinners/new') : path.startsWith(h);
  return (
    <>
      <div className="dash-top"><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(true)} aria-label="Open menu"><I.menu size={18} /></button><Link href="/dashboard"><Logo size={24} /></Link><span className="spacer" /><Link href="/dashboard/skinners/new" className="btn btn-primary btn-sm"><I.plus size={16} />New</Link></div>
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 65, background: 'rgba(0,0,0,.3)' }} />}
      <aside className={`dash-side${open ? ' open' : ''}`}>
        <Link href="/" style={{ padding: '4px 10px 16px' }}><Logo size={26} /></Link>
        <div className="row card" style={{ padding: 10, marginBottom: 12, gap: 10 }}><BrandMark name={brand.name} accent={brand.accent} logo={brand.logo} size={36} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brand.name}</div><div className="tiny faint">{plan} plan</div></div></div>
        {NAV.map(([h, l, Ic]) => <Link key={h} href={h} className={`nav-i${active(h) ? ' active' : ''}`}><Ic size={18} />{l}</Link>)}
        <div className="spacer" />
        <Link href={`/b/${brand.slug}`} className="nav-i" target="_blank"><I.eye size={18} />View public store</Link>
        {user.isAdmin && <Link href="/admin" className="nav-i"><I.shield size={18} />Admin</Link>}
        {user.email !== 'creator@skinify.app' ? (
          <button className="nav-i" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/'); router.refresh(); }}><I.logout size={18} />Sign out</button>
        ) : (
          <div className="tiny faint" style={{ padding: '8px 12px', color: 'var(--iris)' }}>Direct Creator Mode · No account needed</div>
        )}
        <div className="tiny faint" style={{ padding: '4px 12px 8px' }}>{user.email}</div>
      </aside>
    </>
  );
}
