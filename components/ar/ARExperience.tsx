'use client';
import './ar.css';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SkinnerEngine as EngineT, EngineStage, TrackState, EngineErrorCode } from '@/lib/ar/engine';
import { PROFILE_BY_KEY, type ARConfig, type VariantOverrides } from '@/lib/ar/config';
import { I } from '@/components/Icons';
import { Viewer3D } from '@/components/Viewer3D';
import { formatPrice } from '@/lib/format';
import { track, device } from '@/lib/client/track';

export interface ARData {
  skinnerId: string; productId: string; slug: string | null; profileKey: string; config: ARConfig; modelUrl: string | null;
  product: { name: string; slug: string; description: string; price_cents: number | null; currency: string; purchase_url: string | null; images: { url: string }[] };
  brand: { name: string; slug: string; logo_url: string | null; accent: string };
  variants: { id: string; name: string; color_hex: string | null; ar_overrides: VariantOverrides }[];
  branding: boolean; isDemo: boolean;
}
type Phase = 'intro' | 'starting' | 'live' | 'error' | 'viewer' | 'paused';

const ERR: Record<EngineErrorCode, { title: string; body: string }> = {
  camera_denied: { title: 'Camera access is off', body: 'SKINIFY needs your camera to place the product on you. Video never leaves your device. Allow camera access in your browser’s site settings, then try again.' },
  camera_unavailable: { title: 'No camera found', body: 'We couldn’t find a camera we can use. It may be in use by another app, or this device has no camera.' },
  insecure_context: { title: 'Secure connection required', body: 'Browsers only allow camera access on secure (https) pages. Open this Skinner from its https link.' },
  unsupported: { title: 'This browser can’t run AR', body: 'Your browser is missing camera or WebGL support. Try the latest Chrome, Safari or Edge — or view the product in 3D.' },
  model_failed: { title: 'The 3D product didn’t load', body: 'The product model could not be loaded. Check your connection and try again.' },
  tracker_failed: { title: 'Tracking couldn’t start', body: 'The on-device tracking model failed to start. Reloading usually fixes this.' },
  network: { title: 'You’re offline', body: 'Reconnect to the internet to download the tracking model and product.' },
};

export function ARExperience({ data, source = 'link', embedded = false, preview = false, autoStart = false }: { data: ARData; source?: string; embedded?: boolean; preview?: boolean; autoStart?: boolean }) {
  const profile = PROFILE_BY_KEY[data.profileKey];
  const src = preview ? 'preview' : source;
  const stageRef = useRef<HTMLDivElement>(null);
  const engine = useRef<EngineT | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [stage, setStage] = useState<EngineStage>('idle');
  const [trackState, setTrackState] = useState<TrackState>('searching');
  const [hint, setHint] = useState<string | null>(null);
  const [err, setErr] = useState<EngineErrorCode | null>(null);
  const [variant, setVariant] = useState<string | null>(data.variants[0]?.id ?? null);
  const [capture, setCapture] = useState<{ blob: Blob; url: string; kind: 'photo' | 'video' } | null>(null);
  const [flash, setFlash] = useState(false);
  const [rec, setRec] = useState<number | null>(null);
  const [info, setInfo] = useState(false);
  const [multiCam, setMultiCam] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);
  const started = useRef(0);
  const img = data.product.images[0]?.url;
  const overrides = useMemo(() => data.variants.find(v => v.id === variant)?.ar_overrides ?? null, [variant, data.variants]);
  const ev = useCallback((name: string, extra: Record<string, unknown> = {}, durationMs?: number) => track(name, { skinnerId: data.skinnerId, productId: data.productId, source: src, meta: extra, durationMs }), [data.skinnerId, data.productId, src]);
  const flashToast = (t: string) => { setToast(t); setTimeout(() => setToast(null), 1800); };

  useEffect(() => { ev('link_click', { device: device() }); }, [ev]);

  const stop = useCallback((reason: string) => {
    if (engine.current) {
      if (started.current) ev('session_end', { reason }, Math.round(performance.now() - started.current));
      engine.current.destroy(); engine.current = null; started.current = 0;
    }
  }, [ev]);

  const start = useCallback(async () => {
    if (!stageRef.current || !profile) return;
    stop('restart');
    setErr(null); setPhase('starting'); setStage('camera'); setHint(null);
    ev('skinner_launch');
    const { SkinnerEngine } = await import('@/lib/ar/engine');
    const dbg = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
    const e = new SkinnerEngine({
      container: stageRef.current, profile, config: data.config, modelUrl: data.modelUrl, overrides,
      watermark: { enabled: data.branding, label: `${data.brand.name} · ${data.product.name}` }, debug: dbg,
      onStage: (s, d) => {
        setStage(s);
        if (s === 'model') ev('camera_granted');
        if (s === 'running') { setPhase('live'); started.current = performance.now(); ev('ar_session_start'); SkinnerEngine.hasMultipleCameras().then(setMultiCam); }
        if (s === 'error' && d) { /* handled in onError */ }
      },
      onTrack: setTrackState,
      onHint: setHint,
      onEvent: (n, d) => ev(n, d || {}),
      onError: (code) => { setErr(code); setPhase('error'); ev(code === 'camera_denied' ? 'camera_denied' : 'ar_error', { code }); engine.current?.destroy(); engine.current = null; },
      onMetrics: dbg ? (m) => setDebug(`${m.fps.toFixed(0)} fps · detect ${m.detectMs.toFixed(1)} ms · ${m.delegate}`) : undefined,
    });
    engine.current = e;
    e.start();
  }, [profile, data, overrides, ev, stop]);

  useEffect(() => { if (autoStart) start(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { engine.current?.applyVariant(overrides); }, [overrides]);
  // Privacy: release the camera whenever the tab is hidden or the page is left.
  useEffect(() => {
    const vis = () => { if (document.hidden && engine.current) { stop('hidden'); setPhase('paused'); } };
    const unload = () => stop('unload');
    document.addEventListener('visibilitychange', vis); window.addEventListener('pagehide', unload);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', unload); stop('unmount'); };
  }, [stop]);
  useEffect(() => { if (!embedded) { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; } }, [embedded]);

  const close = () => { stop('close'); setPhase('intro'); setCapture(null); };
  const photo = async () => {
    if (!engine.current) return; setFlash(true); setTimeout(() => setFlash(false), 350);
    const b = await engine.current.capturePhoto(); setCapture({ blob: b, url: URL.createObjectURL(b), kind: 'photo' }); ev('capture_photo');
  };
  const recStart = () => {
    const e = engine.current; if (!e) return;
    try { e.startRecording(15000); } catch { flashToast('Recording isn’t supported in this browser'); return; }
    const t0 = Date.now(); setRec(0);
    const iv = setInterval(() => { if (!e.isRecording) { clearInterval(iv); return; } setRec(Date.now() - t0); }, 200);
    e.onRecordingStopped = (b) => { clearInterval(iv); setRec(null); setCapture({ blob: b, url: URL.createObjectURL(b), kind: 'video' }); ev('capture_video', { ms: Date.now() - t0 }); };
  };
  const recStop = () => { engine.current?.stopRecording(); };
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const ext = (b: Blob) => b.type.includes('mp4') ? 'mp4' : b.type.includes('webm') ? 'webm' : 'jpg';
  const fileName = (b: Blob) => `skinify-${data.product.slug}.${ext(b)}`;
  const shareCapture = async () => {
    if (!capture) return;
    const file = new File([capture.blob], fileName(capture.blob), { type: capture.blob.type });
    const link = data.slug ? `${window.location.origin}/s/${data.slug}?src=share` : window.location.href;
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: data.product.name, text: `Trying on ${data.product.name} by ${data.brand.name} — try it yourself: ${link}` }); ev('share', { kind: capture.kind === 'photo' ? 'snap_photo' : 'snap_video', channel: 'native' }); return; }
      if (navigator.share) { await navigator.share({ title: data.product.name, url: link }); ev('share', { kind: 'link', channel: 'native' }); return; }
      await navigator.clipboard.writeText(link); flashToast('Skinner link copied'); ev('share', { kind: 'link', channel: 'copy' });
    } catch { /* cancelled */ }
  };
  const shareLink = async () => {
    const link = data.slug ? `${window.location.origin}/s/${data.slug}?src=share` : window.location.href;
    try { if (navigator.share) { await navigator.share({ title: `${data.product.name} · SKINIFY`, url: link }); ev('share', { kind: 'link', channel: 'native' }); } else { await navigator.clipboard.writeText(link); flashToast('Link copied'); ev('share', { kind: 'link', channel: 'copy' }); } } catch { /* cancelled */ }
  };
  const buy = () => { ev('buy_click'); };
  const has3d = profile?.renderMode === 'model' ? !!data.modelUrl : profile?.renderMode === 'nails';
  const exitHref = preview ? `/dashboard/skinners/${data.skinnerId}` : `/p/${data.brand.slug}/${data.product.slug}`;

  if (!profile) return <div className="ar-root"><div className="ar-screen"><div className="ar-panel"><h2>Unknown Skinner type</h2></div></div></div>;

  const loadingSteps = [['camera', 'Preparing your Skinner…'], ['model', 'Loading 3D product…'], ['tracker', 'Starting AR…']] as const;
  const stepIdx = ['camera', 'model', 'tracker', 'running'].indexOf(stage);

  return (
    <div className={`ar-root${embedded ? ' embedded' : ''}`}>
      <div ref={stageRef} className="ar-stage" aria-label="Live camera with AR product" />

      {phase === 'live' && (
        <>
          <div className="ar-top">
            <button className="ar-btn" onClick={close} aria-label="Stop camera and close AR"><I.close size={20} /></button>
            <button className="ar-pill" onClick={() => setInfo(true)} aria-label="Product info">
              {img && <img src={img} alt="" />}<span className="t"><b>{data.product.name}</b><span>{data.brand.name}{data.product.price_cents != null ? ` · ${formatPrice(data.product.price_cents, data.product.currency)}` : ''}</span></span>
            </button>
            <span className="spacer" />
            {multiCam && <button className="ar-btn" onClick={() => engine.current?.switchCamera().catch(() => flashToast('Could not switch camera'))} aria-label="Switch camera"><I.flip size={20} /></button>}
            <button className="ar-btn" onClick={() => { engine.current?.resetTracking(); flashToast('Tracking reset'); }} aria-label="Reset tracking"><I.refresh size={19} /></button>
            <button className="ar-btn" onClick={shareLink} aria-label="Share this Skinner"><I.share size={19} /></button>
          </div>
          {rec === null && profile.tracker !== 'surface' && <div className={`ar-status ${trackState === 'tracking' || trackState === 'holding' ? '' : trackState}`} aria-live="polite"><i />{trackState === 'tracking' ? `${profile.bodyPart.charAt(0) + profile.bodyPart.slice(1).toLowerCase()} tracked` : trackState === 'holding' ? 'Re-anchoring…' : trackState === 'lost' ? 'Tracking lost — reposition' : 'Looking for your ' + profile.bodyPart.toLowerCase()}</div>}
          {rec !== null && <div className="ar-rec-time">● REC {(rec / 1000).toFixed(1)}s / 15s</div>}
          {hint && <div className="ar-hint" role="status">{profile.tracker === 'hand' ? <I.hand size={18} /> : profile.tracker === 'face' ? <I.face size={18} /> : <I.body size={18} />}{hint}</div>}
          {debug && <div className="ar-debug">{debug}</div>}
          <div className="ar-bottom">
            {data.variants.length > 1 && <div className="ar-variants" role="radiogroup" aria-label="Options">{data.variants.map(v => <button key={v.id} className="ar-variant" role="radio" aria-pressed={variant === v.id} aria-checked={variant === v.id} onClick={() => setVariant(v.id)}><i style={{ background: v.color_hex || '#ccc' }} />{v.name}</button>)}</div>}
            <div className="row" style={{ gap: 4, fontSize: 12, fontWeight: 700 }}>
              {(['photo', 'video'] as const).map(m => <button key={m} onClick={() => setMode(m)} style={{ background: mode === m ? 'rgba(255,255,255,.18)' : 'transparent', color: '#fff', border: 0, borderRadius: 99, padding: '5px 12px', textTransform: 'uppercase', letterSpacing: '.08em' }}>{m}</button>)}
            </div>
            <div className="ar-shutter-row">
              {data.product.purchase_url
                ? <a className="ar-btn" href={data.product.purchase_url} target="_blank" rel="noopener noreferrer nofollow" onClick={buy} aria-label={`Buy from ${data.brand.name}`}><I.bag size={20} /></a>
                : <button className="ar-btn" onClick={() => setInfo(true)} aria-label="Product info"><I.bag size={20} /></button>}
              <button className={`ar-shutter${rec !== null ? ' rec' : ''}`} aria-label={mode === 'photo' ? 'Take photo' : rec !== null ? 'Stop recording' : 'Start recording'} onClick={() => mode === 'photo' ? photo() : rec !== null ? recStop() : recStart()} />
              <button className="ar-btn" onClick={() => { stop('fallback'); setPhase('viewer'); ev('fallback_3d'); }} aria-label="View in 3D" disabled={!has3d}><I.cube size={20} /></button>
            </div>
          </div>
        </>
      )}
      {flash && <div className="ar-flash" />}

      {phase === 'intro' && (
        <div className="ar-screen">
          <div className="ar-panel">
            {!embedded && <Link href={exitHref} className="ar-btn" style={{ position: 'absolute', top: 'calc(14px + env(safe-area-inset-top))', left: 14 }} aria-label="Back to product"><I.back size={20} /></Link>}
            <span className="badge" style={{ background: 'rgba(255,255,255,.1)', color: '#fff' }}>SKINIFY · {profile.name} Skinner{profile.maturity !== 'stable' ? ` · ${profile.maturity}` : ''}</span>
            <div className="ar-product">
              {img && <img src={img} alt="" />}
              <div style={{ minWidth: 0 }}><div className="tiny" style={{ opacity: .6, fontWeight: 700 }}>{data.brand.name}{data.isDemo ? ' · demo brand' : ''}</div><div style={{ fontWeight: 800, fontSize: 18 }}>{data.product.name}</div>{data.product.price_cents != null && <div className="small" style={{ opacity: .75 }}>{formatPrice(data.product.price_cents, data.product.currency)}</div>}</div>
            </div>
            <h1>See it on you.</h1>
            <p>{profile.hint}. The {profile.name.toLowerCase()} will anchor to your {profile.bodyPart.toLowerCase()} and follow as you move.</p>
            <button className="btn btn-xl btn-light btn-block" onClick={start}><I.camera size={20} /> Start camera</button>
            {has3d && <button className="btn btn-ghost btn-block" onClick={() => { setPhase('viewer'); ev('fallback_3d'); }}><I.cube size={18} /> View in 3D instead</button>}
            <p className="tiny row" style={{ gap: 6, justifyContent: 'center', opacity: .6 }}><I.shield size={14} />Processed on your device. Nothing is recorded or uploaded unless you save it.</p>
            {preview && <span className="badge badge-warn">Seller preview — not counted in analytics</span>}
          </div>
        </div>
      )}

      {phase === 'starting' && (
        <div className="ar-screen" style={{ background: 'radial-gradient(80% 60% at 50% 30%, rgba(42,31,74,.92) 0%, rgba(13,11,16,.96) 70%)' }}>
          <div className="ar-panel">
            <div className="ar-orb">{img && <img src={img} alt="" style={{ width: 70, height: 70, objectFit: 'contain', borderRadius: 99, background: 'rgba(255,255,255,.9)' }} />}</div>
            <div className="ar-steps" aria-live="polite">
              {loadingSteps.map(([k, label], i) => <div key={k} className={i === stepIdx ? 'on' : i < stepIdx ? 'done' : ''}><i>{i < stepIdx ? '✓' : ''}</i>{label}</div>)}
            </div>
            {stage === 'camera' && <p className="small">If your browser asks, choose <b>Allow</b> to use the camera.</p>}
            <button className="btn btn-ghost btn-sm" onClick={close}>Cancel</button>
          </div>
        </div>
      )}

      {phase === 'paused' && (
        <div className="ar-screen"><div className="ar-panel"><div className="ar-orb" style={{ width: 80, height: 80 }}><I.camera size={30} /></div><h2>Camera paused</h2><p>We turned the camera off while you were away.</p><button className="btn btn-xl btn-light btn-block" onClick={start}>Resume</button><Link className="btn btn-ghost btn-block" href={exitHref}>Back to product</Link></div></div>
      )}

      {phase === 'error' && err && (
        <div className="ar-screen">
          <div className="ar-panel">
            <div className="ar-orb" style={{ width: 80, height: 80, background: 'radial-gradient(circle at 35% 30%, #fff, #f6b3c8 40%, #6e2a4a)' }}>{err === 'camera_denied' ? <I.lock size={28} /> : <I.camera size={28} />}</div>
            <h2>{ERR[err].title}</h2><p>{ERR[err].body}</p>
            {err === 'camera_denied' && <p className="small" style={{ opacity: .6 }}>{/iPhone|iPad/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') ? 'iPhone: Settings → Safari → Camera → Allow, or tap “aA” in the address bar → Website Settings.' : 'Tap the lock icon next to the address → Permissions → Camera → Allow.'}</p>}
            {!['insecure_context', 'unsupported'].includes(err) && <button className="btn btn-xl btn-light btn-block" onClick={start}><I.refresh size={18} /> Try again</button>}
            {has3d && <button className="btn btn-ghost btn-block" onClick={() => { setPhase('viewer'); ev('fallback_3d'); }}><I.cube size={18} /> View in 3D instead</button>}
            {!embedded && <Link className="btn btn-ghost btn-block" href={exitHref}>Back to product</Link>}
          </div>
        </div>
      )}

      {phase === 'viewer' && (
        <div className="ar-screen" style={{ padding: 0, display: 'block', background: 'radial-gradient(80% 70% at 50% 40%, #ffffff, #efe9ff 60%, #f6e3ea)' }}>
          <Viewer3D url={profile.renderMode === 'model' ? data.modelUrl : null} nails={profile.renderMode === 'nails' ? { ...(data.config.nails as NonNullable<ARConfig['nails']>), ...(overrides?.nails || {}) } : null} config={data.config} overrides={overrides} style={{ position: 'absolute', inset: 0 }} label={`3D view of ${data.product.name}`} />
          <div className="ar-top" style={{ background: 'none' }}>
            <button className="ar-btn" style={{ background: 'rgba(23,20,28,.8)' }} onClick={() => setPhase('intro')} aria-label="Back"><I.back size={20} /></button>
            <span className="badge badge-ar"><i />3D view · drag to rotate</span><span className="spacer" />
            <button className="btn btn-primary btn-sm" onClick={start}><I.camera size={16} /> Try in AR</button>
          </div>
          {data.variants.length > 1 && <div className="ar-bottom" style={{ background: 'none' }}><div className="ar-variants">{data.variants.map(v => <button key={v.id} className="ar-variant" style={{ background: variant === v.id ? 'var(--ink)' : 'rgba(255,255,255,.85)', color: variant === v.id ? '#fff' : 'var(--ink)', borderColor: 'var(--line)' }} aria-pressed={variant === v.id} onClick={() => setVariant(v.id)}><i style={{ background: v.color_hex || '#ccc', borderColor: '#fff' }} />{v.name}</button>)}</div></div>}
        </div>
      )}

      {capture && (
        <div className="ar-sheet" role="dialog" aria-label="Your SKINIFY Snap">
          {capture.kind === 'photo' ? <img className="media" src={capture.url} alt="Your try-on photo" /> : <video className="media" src={capture.url} autoPlay loop playsInline muted controls />}
          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-lg btn-light" style={{ background: '#fff', color: 'var(--ink)' }} onClick={shareCapture}><I.share size={18} /> Share</button>
            <a className="btn btn-lg btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.25)' }} href={capture.url} download={fileName(capture.blob)}><I.download size={18} /> Save</a>
            <button className="btn btn-lg btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.25)' }} onClick={() => { URL.revokeObjectURL(capture.url); setCapture(null); }}>Retake</button>
          </div>
          <p className="tiny" style={{ opacity: .55 }}>Saved only on your device. SKINIFY does not upload your snaps.</p>
        </div>
      )}

      {info && (
        <>
          <div style={{ position: 'absolute', inset: 0, zIndex: 8 }} onClick={() => setInfo(false)} />
          <div className="ar-info" role="dialog" aria-label="Product details">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              {img && <img src={img} alt="" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 14, background: 'var(--bg-2)' }} />}
              <div style={{ flex: 1, minWidth: 0 }}><div className="tiny faint" style={{ fontWeight: 700 }}>{data.brand.name}</div><div style={{ fontWeight: 800, fontSize: 18 }}>{data.product.name}</div>{data.product.price_cents != null && <div className="muted">{formatPrice(data.product.price_cents, data.product.currency)}</div>}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setInfo(false)} aria-label="Close"><I.close size={16} /></button>
            </div>
            {data.product.description && <p className="small muted" style={{ marginTop: 12, maxHeight: 120, overflow: 'auto' }}>{data.product.description}</p>}
            <p className="tiny faint" style={{ marginTop: 10 }}>AR is a visual estimate — real size, fit and colour may differ.</p>
            <div className="row" style={{ marginTop: 14 }}>
              {data.product.purchase_url ? <a className="btn btn-primary" style={{ flex: 1 }} href={data.product.purchase_url} target="_blank" rel="noopener noreferrer nofollow" onClick={buy}><I.bag size={18} />Buy from {data.brand.name}</a>
                : <span className="btn btn-primary" style={{ flex: 1 }} aria-disabled="true">{data.isDemo ? 'Demo brand — not for sale' : 'Store link coming soon'}</span>}
              {!embedded && <Link className="btn btn-ghost" href={exitHref} onClick={() => stop('details')}>Details</Link>}
            </div>
          </div>
        </>
      )}
      {toast && <div className="toast" style={{ bottom: 'calc(150px + env(safe-area-inset-bottom))' }}>{toast}</div>}
    </div>
  );
}
