'use client';
import { useEffect, useState, useCallback } from 'react';
/** Guest favourites live on-device (localStorage). Account-synced favourites use the `favorites` table (future). */
const KEY = 'skn_favs';
export interface Fav { id: string; href: string; name: string; brand: string; image: string | null }
function read(): Fav[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function useFavorites() {
  const [favs, setFavs] = useState<Fav[]>([]);
  useEffect(() => { setFavs(read()); const h = () => setFavs(read()); window.addEventListener('skn-favs', h); window.addEventListener('storage', h); return () => { window.removeEventListener('skn-favs', h); window.removeEventListener('storage', h); }; }, []);
  const toggle = useCallback((f: Fav) => { const cur = read(); const next = cur.some(x => x.id === f.id) ? cur.filter(x => x.id !== f.id) : [f, ...cur].slice(0, 200); localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event('skn-favs')); }, []);
  return { favs, has: (id: string) => favs.some(f => f.id === id), toggle };
}
