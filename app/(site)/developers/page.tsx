import { siteUrl } from '@/lib/format';
export const metadata = { title: 'Embed, SDK & API' };
export default function Dev() {
  const o = siteUrl();
  const code = (s: string) => <pre style={{ background: '#141118', color: '#e9e3ff', padding: 18, borderRadius: 16, overflowX: 'auto', fontSize: 13, lineHeight: 1.6 }}><code>{s}</code></pre>;
  return (
    <div className="container" style={{ paddingBlock: '40px', maxWidth: 900 }}>
      <div className="eyebrow">For developers</div>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', marginTop: 8 }}>Put “Try it on” on any site</h1>
      <h2 style={{ fontSize: 24, marginTop: 36 }}>1 · Button (any plan)</h2>
      <p className="muted" style={{ margin: '8px 0 12px' }}>A plain link to the Skinner. Works everywhere, including email.</p>
      {code(`<a href="${o}/s/YOUR-SLUG?src=link">Try it on</a>`)}
      <h2 style={{ fontSize: 24, marginTop: 30 }}>2 · Embedded experience (plans with embed)</h2>
      <p className="muted" style={{ margin: '8px 0 12px' }}>Camera access inside an iframe requires the <code>allow="camera"</code> attribute.</p>
      {code(`<iframe src="${o}/embed/YOUR-SLUG" allow="camera; fullscreen; web-share" style="width:100%;height:640px;border:0;border-radius:16px"></iframe>`)}
      <h2 style={{ fontSize: 24, marginTop: 30 }}>3 · JavaScript SDK (preview)</h2>
      <p className="muted" style={{ margin: '8px 0 12px' }}>Adds a styled button that opens the Skinner in a modal.</p>
      {code(`<script src="${o}/sdk/v1.js" async></script>\n<button data-skinify="YOUR-SLUG">Try it on</button>`)}
      <h2 style={{ fontSize: 24, marginTop: 30 }}>4 · REST API (plans with API access)</h2>
      <p className="muted" style={{ margin: '8px 0 12px' }}>Create an API key in Dashboard → Account. Read-only in v1.</p>
      {code(`curl -H "Authorization: Bearer skn_live_…" ${o}/api/v1/skinners\ncurl -H "Authorization: Bearer skn_live_…" "${o}/api/v1/analytics?days=30"`)}
    </div>
  );
}
