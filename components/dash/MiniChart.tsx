/** Dependency-free SVG bar/line chart for daily series. */
export function MiniChart({ data, keys, height = 180 }: { data: Record<string, number | string>[]; keys: { key: string; label: string; color: string }[]; height?: number }) {
  const W = 800, H = height, pad = 26; const n = data.length || 1;
  const max = Math.max(1, ...data.flatMap(d => keys.map(k => Number(d[k.key]) || 0)));
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const empty = data.every(d => keys.every(k => !Number(d[k.key])));
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Daily activity chart" preserveAspectRatio="none">
        {[0, 0.5, 1].map(t => <line key={t} x1={pad} x2={W - pad} y1={y(max * t)} y2={y(max * t)} stroke="rgba(23,20,28,.07)" />)}
        {keys.map(k => {
          const pts = data.map((d, i) => `${x(i)},${y(Number(d[k.key]) || 0)}`).join(' ');
          return <g key={k.key}><polyline points={`${pad},${H - pad} ${pts} ${W - pad},${H - pad}`} fill={k.color} opacity={0.08} stroke="none" /><polyline points={pts} fill="none" stroke={k.color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></g>;
        })}
        <text x={pad} y={14} fontSize="12" fill="#8a8491">{max}</text>
      </svg>
      {empty && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }} className="small faint">No events recorded in this period yet</div>}
      <div className="row tiny muted" style={{ gap: 14, marginTop: 6, flexWrap: 'wrap' }}>{keys.map(k => <span key={k.key} className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 3, borderRadius: 2, background: k.color }} />{k.label}</span>)}<span className="spacer" />{data.length > 0 && <span>{String(data[0].day)} → {String(data[data.length - 1].day)}</span>}</div>
    </div>
  );
}
