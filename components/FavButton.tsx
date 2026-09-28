'use client';
import { useFavorites, Fav } from '@/lib/client/favorites';
import { I } from './Icons';
export function FavButton({ fav, big = false }: { fav: Fav; big?: boolean }) {
  const { has, toggle } = useFavorites(); const on = has(fav.id);
  return (
    <button type="button" className={big ? 'btn btn-ghost btn-icon' : 'icon-btn'} aria-pressed={on} aria-label={on ? 'Remove from saved' : 'Save'} onClick={() => toggle(fav)}>
      <I.heart size={big ? 20 : 18} fill={on ? '#E0567E' : 'none'} stroke={on ? '#E0567E' : 'currentColor'} />
    </button>
  );
}
