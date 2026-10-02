'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { I } from './Icons';
import { SearchOverlay } from './SearchOverlay';

export function SiteHeader({ user }: { user: { name: string; isSeller: boolean; isAdmin: boolean } | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState(false);
  const path = usePathname();
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target as HTMLElement)?.closest('input,textarea'))) { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', k); const open = () => setSearch(true); window.addEventListener('skn-search', open);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('skn-search', open); };
  }, []);
  useEffect(() => { document.body.classList.add('has-tabbar'); return () => document.body.classList.remove('has-tabbar'); }, []);
  const is = (p: string) => (path === p || path.startsWith(p + '/')) ? 'active' : '';
  return (
    <>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container inner">
          <Link href="/" aria-label="SKINIFY home"><Logo /></Link>
          <nav className="nav" aria-label="Primary">
            <Link href="/explore" className={is('/explore')}>Explore</Link>
            <Link href="/categories" className={is('/categories')}>Categories</Link>
            <Link href="/explore?sort=trending" className="">Trending</Link>
            <Link href="/brands" className={is('/brands')}>For Brands</Link>
          </nav>
          <div className="spacer" />
          <button className="search-trigger" onClick={() => setSearch(true)} aria-label="Search products"><I.search size={17} /> Search Skinners<kbd>⌘K</kbd></button>
          <button className="btn btn-ghost btn-icon btn-sm show-md" onClick={() => setSearch(true)} aria-label="Search"><I.search size={18} /></button>
          <Link href="/dashboard" className="btn btn-ghost btn-sm hide-md">Studio</Link>
          <Link href="/dashboard/skinners/new" className="btn btn-primary btn-sm">Create Skinner</Link>
          {user?.isAdmin && <Link href="/admin" className="btn btn-ghost btn-sm hide-md">Admin</Link>}
        </div>
      </header>
      <nav className="tabbar" aria-label="Mobile">
        <Link href="/" className={path === '/' ? 'active' : ''}><I.home size={21} />Home</Link>
        <Link href="/explore" className={is('/explore') || is('/categories')}><I.grid size={21} />Explore</Link>
        <Link href="/explore?sort=trending&ar=1" aria-label="Try trending Skinners"><span className="tab-try"><I.camera size={22} /></span></Link>
        <Link href="/saved" className={is('/saved')}><I.heart size={21} />Saved</Link>
        <Link href="/dashboard" className={is('/dashboard')}><I.store size={21} />Studio</Link>
      </nav>
      {search && <SearchOverlay onClose={() => setSearch(false)} />}
    </>
  );
}
