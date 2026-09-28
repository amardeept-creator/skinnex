'use client';
import { useEffect, useState } from 'react';
import { I } from '@/components/Icons';

export function LinkPanel({ slug, name, canEmbed, expires }: { slug: string; name: string; canEmbed: boolean; expires?: string | null }) {
  const [origin, setOrigin] = useState(''); const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => setOrigin(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin), []);
  const url = `${origin}/s/${slug}`;
  const copy = async (t: string, k: string) => { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 1500); };
  const embed = `<iframe src="${origin}/embed/${slug}" allow="camera; fullscreen; web-share" style="width:100%;height:640px;border:0;border-radius:16px" title="Try on ${name.replace(/"/g, '')}"></iframe>`;
  const sdk = `<script src="${origin}/sdk/v1.js" async></script>\n<button data-skinify="${slug}">Try it on</button>`;
  const share = async () => { try { if (navigator.share) await navigator.share({ title: `Try on ${name}`, url }); else copy(url, 'link'); } catch { /* cancelled */ } };
  const copyQr = async () => {
    try { const b = await fetch(`/api/qr/${slug}?format=png&size=1024`).then(r => r.blob()); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); setCopied('qr'); setTimeout(() => setCopied(null), 1500); }
    catch { copy(`${origin}/api/qr/${slug}?format=png`, 'qr'); }
  };
  const print = () => {
    const w = window.open('', '_blank', 'width=600,height=800'); if (!w) return;
    w.document.write(`<!doctype html><title>${name}</title><body style="font-family:system-ui;text-align:center;padding:48px"><div style="font-weight:800;letter-spacing:.2em;font-size:13px">SKINIFY</div><h1 style="font-size:34px;margin:18px 0 6px">Try it on</h1><p style="color:#555;margin:0 0 24px">${name.replace(/</g, '&lt;')}</p><img src="${origin}/api/qr/${slug}?format=svg" style="width:320px;height:320px"><p style="color:#555">Scan with your phone camera</p><p style="font-family:monospace">${url.replace(/^https?:\/\//, '')}</p><script>setTimeout(()=>print(),400)</script></body>`);
    w.document.close();
  };
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', padding: 10, borderRadius: 16, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
        <I.link size={18} /><code style={{ flex: 1, minWidth: 180, wordBreak: 'break-all', fontSize: 14 }}>{url}</code>
        <button className="btn btn-sm btn-primary" onClick={() => copy(url, 'link')}>{copied === 'link' ? <><I.check size={15} />Copied</> : <><I.copy size={15} />Copy link</>}</button>
        <a className="btn btn-sm btn-ghost" href={`/s/${slug}`} target="_blank" rel="noreferrer">Open</a>
        <button className="btn btn-sm btn-ghost" onClick={share}><I.share size={15} />Share</button>
      </div>
      {expires !== undefined && <p className="tiny faint">{expires ? `Link expires ${new Date(expires).toLocaleDateString()}` : 'Link has no fixed expiry — it stays live while your subscription is active.'}</p>}
      <div className="row" style={{ gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <img src={`/api/qr/${slug}?format=svg`} alt={`QR code for ${name}`} width={168} height={168} style={{ borderRadius: 14, border: '1px solid var(--line)', background: '#fff' }} />
        <div className="stack" style={{ gap: 8, flex: 1, minWidth: 200 }}>
          <b>QR code</b><span className="small muted">Scans open the Skinner and are attributed as “QR” in analytics. Use on packaging, tags, posters and in-store displays.</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <a className="btn btn-sm btn-ghost" href={`/api/qr/${slug}?format=png&size=1024&download=1`}><I.download size={15} />PNG</a>
            <a className="btn btn-sm btn-ghost" href={`/api/qr/${slug}?format=svg&download=1`}><I.download size={15} />SVG</a>
            <button className="btn btn-sm btn-ghost" onClick={copyQr}>{copied === 'qr' ? 'Copied' : 'Copy image'}</button>
            <button className="btn btn-sm btn-ghost" onClick={print}>Print display card</button>
          </div>
        </div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <div className="row"><b>“Try it on” for your website</b>{!canEmbed && <span className="badge badge-warn">Not in your plan</span>}</div>
        {canEmbed ? (<>
          <span className="small muted">Paste into any product page. Camera access in iframes needs the allow attribute (included).</span>
          <pre style={{ background: '#141118', color: '#e9e3ff', padding: 14, borderRadius: 12, overflowX: 'auto', fontSize: 12, margin: 0 }}><code>{embed}</code></pre>
          <div className="row"><button className="btn btn-sm btn-ghost" onClick={() => copy(embed, 'embed')}>{copied === 'embed' ? 'Copied' : 'Copy iframe'}</button><button className="btn btn-sm btn-ghost" onClick={() => copy(sdk, 'sdk')}>{copied === 'sdk' ? 'Copied' : 'Copy SDK button'}</button></div>
        </>) : <span className="small muted">Upgrade to embed Skinners on your site. A plain link always works.</span>}
      </div>
    </div>
  );
}
