import { num } from '@/lib/format';
export function Stat({ k, v, sub }: { k: string; v: number | string; sub?: string }) {
  return <div className="card stat"><div className="k">{k}</div><div className="v">{typeof v === 'number' ? num(v) : v}</div>{sub && <div className="tiny faint">{sub}</div>}</div>;
}
