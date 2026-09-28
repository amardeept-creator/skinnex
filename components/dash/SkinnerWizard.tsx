'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Uploader } from './Uploader';
import { Viewer3D } from '@/components/Viewer3D';
import { ARExperience, type ARData } from '@/components/ar/ARExperience';
import { I } from '@/components/Icons';
import { formatBytes } from '@/lib/format';
import { LinkPanel } from './LinkPanel';
import {
  BODY_PARTS, PROFILE_BY_KEY, FINGERS, NAIL_SHAPES, NAIL_FINISHES, LIP_FINISHES, buildDefaultConfig, arConfigSchema,
  type ARConfig, type VariantOverrides,
} from '@/lib/ar/config';

export interface AssetOpt { id: string; url: string; name: string; bytes: number; triangles?: number; materials?: string[]; template: boolean; profile?: string | null; warnings?: string[] }
export interface WizardInitial {
  id?: string; brandId: string; status?: string; linkSlug?: string | null; linkExpires?: string | null;
  product: { name: string; category: string; description: string; price: number | null; currency: string; purchaseUrl: string; tags: string[]; colors: string[]; images: string[]; videoUrl: string | null };
  variants: { name: string; color_hex: string | null; ar_overrides: VariantOverrides }[];
  profile: string; assetId: string | null; config: ARConfig | null;
}
interface Props { initial: WizardInitial; brands: { id: string; name: string; slug: string; accent: string; logo_url: string | null }[]; categories: { slug: string; name: string; default_profile: string | null }[]; assets: AssetOpt[]; first?: boolean; canEmbed: boolean; branding: boolean }

const STEPS = ['Product', '3D / AR asset', 'Skinner type', 'AR setup', 'Preview', 'Publish', 'Share'];
const COLOR_TAGS = ['gold', 'silver', 'rose', 'black', 'white', 'pink', 'red', 'nude', 'brown', 'green', 'blue', 'purple', 'beige', 'grey'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'CAD', 'AUD', 'JPY'];

export function SkinnerWizard({ initial, brands, categories, assets: initialAssets, first, canEmbed, branding }: Props) {
  // (router intentionally unused for refresh — see save())
  const [step, setStep] = useState(initial.id ? 3 : 0);
  const [id, setId] = useState<string | undefined>(initial.id);
  const [status, setStatus] = useState(initial.status || 'draft');
  const [linkSlug, setLinkSlug] = useState(initial.linkSlug || null);
  const [brandId, setBrandId] = useState(initial.brandId);
  const [p, setP] = useState(initial.product);
  const [variants, setVariants] = useState(initial.variants);
  const [profileKey, setProfileKey] = useState(initial.profile);
  const [assetId, setAssetId] = useState<string | null>(initial.assetId);
  const [assets, setAssets] = useState(initialAssets);
  const [cfg, setCfg] = useState<ARConfig>(initial.config ?? buildDefaultConfig(initial.profile));
  const [materials, setMaterials] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [saved, setSaved] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [assetMode, setAssetMode] = useState<'upload' | 'template' | 'library' | 'none'>(initial.assetId ? (initialAssets.find(a => a.id === initial.assetId)?.template ? 'template' : 'library') : 'upload');
  const [variantPreview, setVariantPreview] = useState<number>(-1);

  const profile = PROFILE_BY_KEY[profileKey];
  const asset = assets.find(a => a.id === assetId) || null;
  const needsModel = profile.renderMode === 'model';
  const brand = brands.find(b => b.id === brandId)!;
  const setField = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => { setP(s => ({ ...s, [k]: v })); setSaved(null); };
  const patchCfg = (patch: Partial<ARConfig>) => { setCfg(c => arConfigSchema.parse({ ...c, ...patch })); setSaved(null); };
  const patchT = (patch: Partial<ARConfig['transform']>) => patchCfg({ transform: { ...cfg.transform, ...patch } });

  const chooseProfile = (key: string) => {
    const next = PROFILE_BY_KEY[key];
    const base = buildDefaultConfig(key);
    const tpl = asset?.template;
    setProfileKey(key);
    setCfg(tpl ? { ...base, size: { mode: 'authored', fitSize: base.size.fitSize, fitAxis: base.size.fitAxis, center: false } } : base);
    if (next.renderMode !== 'model') setAssetMode('none');
    setSaved(null);
  };
  const chooseAsset = (a: AssetOpt | null) => {
    setAssetId(a?.id ?? null); setSaved(null);
    if (a?.template && a.profile && PROFILE_BY_KEY[a.profile]) {
      const base = buildDefaultConfig(a.profile);
      setProfileKey(a.profile);
      setCfg({ ...base, size: { mode: 'authored', fitSize: base.size.fitSize, fitAxis: base.size.fitAxis, center: false } });
    } else if (a && !a.template && cfg.size.mode === 'authored') {
      const base = buildDefaultConfig(profileKey); setCfg({ ...cfg, size: base.size });
    }
  };

  const payload = () => ({
    brandId, profile: profileKey, assetId: needsModel ? assetId : null, config: cfg, variants,
    product: { ...p, price: p.price, purchaseUrl: p.purchaseUrl || null, tags: p.tags, colors: p.colors },
  });
  const validateStep = (s: number): string | null => {
    if (s >= 0 && p.name.trim().length < 2) return 'Add a product name (step 1).';
    if (s >= 0 && !p.category) return 'Choose a category (step 1).';
    if (s >= 5 && !p.images.length) return 'Add at least one product image before publishing (step 1).';
    if (s >= 3 && needsModel && !assetId) return 'This Skinner type needs a 3D model (step 2).';
    if (s >= 3 && profile.renderMode === 'image_plane' && !cfg.imagePlane?.url) return 'Upload a transparent garment image (step 4).';
    return null;
  };
  const save = async (): Promise<string | null> => {
    const v = validateStep(0); if (v) { setErr(v); return null; }
    setBusy(true); setErr(null);
    const r = await fetch(id ? `/api/skinners/${id}` : '/api/skinners', { method: id ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload()) });
    const d = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(d.issues?.[0] ? `${d.issues[0].path}: ${d.issues[0].message}` : d.error || 'Could not save'); return null; }
    // new Skinner: update the URL without refreshing (a refresh would remount the wizard and lose the current step)
    if (!id) { setId(d.id); window.history.replaceState(null, '', `/dashboard/skinners/${d.id}`); }
    setSaved('Draft saved'); return d.id;
  };
  const publish = async () => {
    const v = validateStep(5); if (v) { setErr(v); return; }
    const sid = await save(); if (!sid) return;
    setBusy(true);
    const r = await fetch(`/api/skinners/${sid}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'publish' }) });
    const d = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setErr(d.error || 'Could not publish'); return; }
    const g = await fetch(`/api/skinners/${sid}`).then(r => r.json());
    setLinkSlug(g.skinner.link_slug); setStatus('published'); setStep(6);
  };

  const previewData: ARData = useMemo(() => ({
    skinnerId: id || 'preview', productId: 'preview', slug: linkSlug, profileKey, config: cfg, modelUrl: asset?.url ?? null,
    product: { name: p.name || 'Untitled product', slug: 'preview', description: p.description, price_cents: p.price == null ? null : Math.round(p.price * 100), currency: p.currency, purchase_url: p.purchaseUrl || null, images: p.images.map(url => ({ url })) },
    brand: { name: brand.name, slug: brand.slug, logo_url: brand.logo_url, accent: brand.accent },
    variants: variants.map((v, i) => ({ id: String(i), ...v })), branding, isDemo: false,
  }), [id, linkSlug, profileKey, cfg, asset, p, brand, variants, branding]);

  const vOverride = variantPreview >= 0 ? variants[variantPreview]?.ar_overrides : null;
  const nailsPreview = profile.renderMode === 'nails' ? { ...cfg.nails!, ...(vOverride?.nails || {}) } : null;

  const go = (s: number) => { setErr(null); if (s > step) { const v = validateStep(s - 1 >= 3 ? s - 1 : 0); if (v && s > 2) { setErr(v); return; } } setStep(s); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="dash-head" style={{ marginBottom: 0 }}>
        <div><div className="eyebrow">{id ? (status === 'published' ? 'Published Skinner' : 'Draft Skinner') : first ? 'Step 3 of onboarding' : 'New Skinner'}</div><h1 style={{ marginTop: 6 }}>{p.name || 'Create a Skinner'}</h1></div>
        <span className="spacer" />
        {saved && <span className="small" style={{ color: 'var(--success)' }}><I.check size={14} style={{ display: 'inline', verticalAlign: -2 }} /> {saved}</span>}
        <button className="btn btn-ghost" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</button>
        {id && <Link className="btn btn-ghost" href={`/dashboard/skinners/${id}/preview`}><I.camera size={16} />Full-screen preview</Link>}
      </div>
      <div className="wizard-steps" role="tablist">{STEPS.map((s, i) => <button key={s} role="tab" aria-selected={step === i} className={step === i ? 'on' : i < step ? 'done' : ''} onClick={() => go(i)} disabled={i === 6 && !linkSlug}><span className="n">{i < step ? '✓' : i + 1}</span>{s}</button>)}</div>
      {err && <div className="alert alert-danger" role="alert">{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: step >= 1 && step <= 3 ? 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' : 'minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        <div className="card card-pad stack" style={{ gap: 18 }}>
          {step === 0 && (<>
            <h2 style={{ fontSize: 24 }}>Product information</h2>
            {brands.length > 1 && <label className="field"><span className="label">Brand</span><select className="select" value={brandId} onChange={(e) => setBrandId(e.target.value)} disabled={!!id}>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
            <label className="field"><span className="label">Product name *</span><input className="input" value={p.name} onChange={(e) => setField('name', e.target.value)} maxLength={120} placeholder="e.g. Solitaire Diamond Ring" /></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              <label className="field"><span className="label">Category *</span><select className="select" value={p.category} onChange={(e) => { setField('category', e.target.value); const d = categories.find(c => c.slug === e.target.value)?.default_profile; if (d && !id && !assetId) chooseProfile(d); }}><option value="">Choose…</option>{categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
              <label className="field"><span className="label">Price</span><div className="row" style={{ gap: 6 }}><select className="select" style={{ width: 92 }} value={p.currency} onChange={(e) => setField('currency', e.target.value)}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select><input className="input" inputMode="decimal" value={p.price ?? ''} onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ''); setField('price', v === '' ? null : Number(v)); }} placeholder="0.00" /></div></label>
            </div>
            <label className="field"><span className="label">Store link (where customers buy)</span><input className="input" value={p.purchaseUrl} onChange={(e) => setField('purchaseUrl', e.target.value)} placeholder="https://yourstore.com/products/…" inputMode="url" /><span className="help">The “Buy” button inside the Skinner opens this page. SKINIFY does not process orders.</span></label>
            <label className="field"><span className="label">Description</span><textarea className="textarea" value={p.description} onChange={(e) => setField('description', e.target.value)} maxLength={4000} /></label>
            <label className="field"><span className="label">Tags</span><input className="input" value={p.tags.join(', ')} onChange={(e) => setField('tags', e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 20))} placeholder="bridal, minimal, party" /><span className="help">Comma separated — used by search.</span></label>
            <div className="field"><span className="label">Colours (for search filters)</span><div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{COLOR_TAGS.map(c => <button type="button" key={c} className="chip" aria-pressed={p.colors.includes(c)} onClick={() => setField('colors', p.colors.includes(c) ? p.colors.filter(x => x !== c) : [...p.colors, c])}>{c}</button>)}</div></div>
            <div className="field"><span className="label">Product images * <span className="faint">({p.images.length}/8)</span></span>
              <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
                {p.images.map((u, i) => <div key={u} style={{ position: 'relative' }}><img src={u} alt="" style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 14, background: 'var(--bg-2)' }} />{i === 0 && <span className="badge badge-dark" style={{ position: 'absolute', left: 6, bottom: 6 }}>Cover</span>}<button type="button" className="icon-btn" style={{ position: 'absolute', top: -8, right: -8, width: 26, height: 26 }} aria-label="Remove image" onClick={() => setField('images', p.images.filter(x => x !== u))}><I.close size={13} /></button></div>)}
              </div>
              {p.images.length < 8 && <Uploader kind="image" accept="image/png,image/jpeg,image/webp" compact label="Add product image" help="PNG with transparent background looks best" onDone={(a) => setField('images', [...p.images, a.url])} />}
            </div>
            <div className="field"><span className="label">Product video (optional)</span>
              {p.videoUrl ? <div className="row"><video src={p.videoUrl} style={{ width: 160, borderRadius: 12 }} muted controls /><button type="button" className="btn btn-ghost btn-sm" onClick={() => setField('videoUrl', null)}>Remove</button></div>
                : <Uploader kind="video" accept="video/mp4,video/webm" compact label="Upload MP4 / WebM" onDone={(a) => setField('videoUrl', a.url)} />}</div>
          </>)}

          {step === 1 && (<>
            <h2 style={{ fontSize: 24 }}>3D / AR asset</h2>
            <div className="choice-grid">
              {([['upload', 'Upload 3D model', 'GLB or self-contained GLTF', I.upload], ['template', 'SKINIFY base model', 'Start from a ready model', I.sparkle], ['library', 'Existing asset', 'From your asset library', I.cube], ['none', 'No 3D model', 'Nails, lip colour or 2D garment', I.image]] as const).map(([k, t, d, Ic]) => (
                <button key={k} type="button" className="choice" aria-pressed={assetMode === k} onClick={() => { setAssetMode(k); if (k === 'none') { chooseAsset(null); if (PROFILE_BY_KEY[profileKey].renderMode === 'model') chooseProfile('nails'); } }}><Ic size={20} /><b>{t}</b><span className="tiny muted">{d}</span></button>
              ))}
            </div>
            {assetMode === 'upload' && (<>
              <Uploader kind="model" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" label="Drop your .glb here" help="glTF 2.0 · PBR materials · up to your plan’s file limit · max 400k triangles" onDone={(a) => { const o: AssetOpt = { id: a.id, url: a.url, name: a.original_filename, bytes: a.bytes, triangles: a.meta.triangles as number, materials: a.meta.materials as string[], template: false, warnings: a.meta.warnings as string[] }; setAssets(s => [o, ...s]); chooseAsset(o); }} />
              <div className="alert alert-info small"><div><b>Model tips.</b> Export in metres with the origin at the anchor point (e.g. centre of the ring hole). If the scale is off, SKINIFY fits it to real-world size automatically, and you can fine-tune in AR setup. Draco and Meshopt compression are supported.</div></div>
            </>)}
            {assetMode === 'template' && <div className="choice-grid">{assets.filter(a => a.template).map(a => <button key={a.id} type="button" className="choice" aria-pressed={assetId === a.id} onClick={() => chooseAsset(a)}><b>{a.name}</b><span className="tiny muted">{a.profile ? PROFILE_BY_KEY[a.profile]?.name : ''} · {formatBytes(a.bytes)}</span></button>)}</div>}
            {assetMode === 'library' && (assets.filter(a => !a.template).length ? <div className="choice-grid">{assets.filter(a => !a.template).map(a => <button key={a.id} type="button" className="choice" aria-pressed={assetId === a.id} onClick={() => chooseAsset(a)}><b style={{ wordBreak: 'break-all' }}>{a.name}</b><span className="tiny muted">{formatBytes(a.bytes)}{a.triangles ? ` · ${a.triangles.toLocaleString()} tris` : ''}</span></button>)}</div> : <p className="small muted">You haven’t uploaded any models yet.</p>)}
            {assetMode === 'none' && <p className="small muted">Nails and lip colour are generated by SKINIFY from the design you choose in AR setup. Clothing uses a transparent PNG overlay (experimental).</p>}
            {asset && (
              <div className="card" style={{ padding: 14, background: 'var(--surface-2)' }}>
                <div className="row"><I.cube size={18} /><b className="small" style={{ wordBreak: 'break-all' }}>{asset.name}</b><span className="spacer" /><span className="badge badge-success">Validated</span></div>
                <div className="tiny muted" style={{ marginTop: 6 }}>{formatBytes(asset.bytes)}{asset.triangles ? ` · ${asset.triangles.toLocaleString()} triangles` : ''}{asset.materials?.length ? ` · materials: ${asset.materials.join(', ')}` : ''}</div>
                {asset.warnings?.map(w => <div key={w} className="tiny" style={{ color: 'var(--warn)', marginTop: 4 }}>⚠ {w}</div>)}
              </div>
            )}
          </>)}

          {step === 2 && (<>
            <h2 style={{ fontSize: 24 }}>Where does it go?</h2>
            <p className="small muted">Choose the body part SKINIFY should track. This decides the tracker and anchor.</p>
            {BODY_PARTS.map(bp => (
              <div key={bp.key}><div className="eyebrow" style={{ marginBottom: 8 }}>{bp.label}</div>
                <div className="choice-grid">{bp.profiles.map(k => { const pr = PROFILE_BY_KEY[k]; const disabled = pr.renderMode === 'model' && assetMode === 'none'; return (
                  <button key={k} type="button" className="choice" aria-pressed={profileKey === k} disabled={disabled} style={disabled ? { opacity: .45 } : undefined} onClick={() => chooseProfile(k)}>
                    <b>{pr.name}</b><span className="tiny muted">{pr.tracker} tracking</span>{pr.maturity !== 'stable' && <span className={`badge ${pr.maturity === 'beta' ? 'badge-iris' : 'badge-warn'}`} style={{ alignSelf: 'flex-start' }}>{pr.maturity}</span>}
                  </button>); })}</div></div>
            ))}
            <div className="alert alert-info small">{profile.description}</div>
          </>)}

          {step === 3 && (<>
            <h2 style={{ fontSize: 24 }}>AR setup</h2>
            {profile.anchor === 'finger' && <div className="field"><span className="label">Finger</span><div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{FINGERS.map(f => <button key={f} type="button" className="chip" aria-pressed={cfg.finger === f} onClick={() => patchCfg({ finger: f })}>{f}</button>)}</div></div>}
            {profile.anchor === 'shoulder' && <div className="field"><span className="label">Shoulder</span><div className="row" style={{ gap: 6 }}>{(['left', 'right'] as const).map(f => <button key={f} type="button" className="chip" aria-pressed={cfg.side === f} onClick={() => patchCfg({ side: f })}>{f}</button>)}</div></div>}
            {profile.renderMode === 'model' && (<>
              <div className="field"><span className="label">Real-world size</span>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}><button type="button" className="chip" aria-pressed={cfg.size.mode === 'fit'} onClick={() => patchCfg({ size: { ...cfg.size, mode: 'fit' } })}>Fit to size</button><button type="button" className="chip" aria-pressed={cfg.size.mode === 'authored'} onClick={() => patchCfg({ size: { ...cfg.size, mode: 'authored' } })}>Use model units (metres)</button></div>
                {cfg.size.mode === 'fit' && <div className="row" style={{ marginTop: 8 }}><input className="input" style={{ width: 110 }} type="number" min={2} max={3000} step={0.5} value={Math.round(cfg.size.fitSize * 10000) / 10} onChange={(e) => patchCfg({ size: { ...cfg.size, fitSize: Math.max(0.002, Math.min(3, Number(e.target.value) / 1000 || 0.02)) } })} /><span className="small">mm along</span><select className="select" style={{ width: 110 }} value={cfg.size.fitAxis} onChange={(e) => patchCfg({ size: { ...cfg.size, fitAxis: e.target.value as 'x' } })}><option value="max">longest</option><option value="x">width (X)</option><option value="y">height (Y)</option><option value="z">depth (Z)</option></select></div>}
              </div>
              <Slider label="Scale" value={cfg.transform.scale} min={0.3} max={3} step={0.01} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => patchT({ scale: v })} />
              {(['X', 'Y', 'Z'] as const).map((ax, i) => <Slider key={ax} label={`Position ${ax}`} value={cfg.transform.position[i] * 1000} min={-60} max={60} step={0.5} fmt={(v) => `${v.toFixed(1)} mm`} onChange={(v) => { const pos = [...cfg.transform.position] as [number, number, number]; pos[i] = v / 1000; patchT({ position: pos }); }} />)}
              {(['X', 'Y', 'Z'] as const).map((ax, i) => <Slider key={ax} label={`Rotation ${ax}`} value={cfg.transform.rotation[i]} min={-180} max={180} step={1} fmt={(v) => `${v.toFixed(0)}°`} onChange={(v) => { const r = [...cfg.transform.rotation] as [number, number, number]; r[i] = v; patchT({ rotation: r }); }} />)}
              <Toggle label="Occlusion" help="Hide parts of the product behind the finger / wrist / head" on={cfg.occlusion} set={(v) => patchCfg({ occlusion: v })} />
              <Toggle label="Scale with body" help="Adapt size to the measured finger / wrist / face" on={cfg.fitToBody} set={(v) => patchCfg({ fitToBody: v })} />
              {profile.anchor === 'ears' && <><Toggle label="Pair" help="Show on both ears" on={cfg.pair} set={(v) => patchCfg({ pair: v })} /><Toggle label="Dangle" help="Gravity swing" on={cfg.dangle} set={(v) => patchCfg({ dangle: v })} /></>}
              <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => patchCfg({ transform: { scale: 1, position: [0, 0, 0], rotation: [0, 0, 0] } })}>Reset transform</button>
            </>)}
            {profile.renderMode === 'nails' && cfg.nails && (<>
              <div className="field"><span className="label">Shape</span><div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{NAIL_SHAPES.map(s => <button key={s} type="button" className="chip" aria-pressed={cfg.nails!.shape === s} onClick={() => patchCfg({ nails: { ...cfg.nails!, shape: s } })}>{s}</button>)}</div></div>
              <div className="field"><span className="label">Finish</span><div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{NAIL_FINISHES.map(s => <button key={s} type="button" className="chip" aria-pressed={cfg.nails!.finish === s} onClick={() => patchCfg({ nails: { ...cfg.nails!, finish: s } })}>{s}</button>)}</div></div>
              <ColorField label="Colour" value={cfg.nails.color} onChange={(c) => patchCfg({ nails: { ...cfg.nails!, color: c } })} />
              {cfg.nails.finish === 'french' && <ColorField label="Tip colour" value={cfg.nails.tipColor} onChange={(c) => patchCfg({ nails: { ...cfg.nails!, tipColor: c } })} />}
              <Slider label="Length" value={cfg.nails.length} min={1} max={2.4} step={0.05} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => patchCfg({ nails: { ...cfg.nails!, length: v } })} />
            </>)}
            {profile.renderMode === 'lips' && cfg.lips && (<>
              <ColorField label="Lip colour" value={cfg.lips.color} onChange={(c) => patchCfg({ lips: { ...cfg.lips!, color: c } })} />
              <div className="field"><span className="label">Finish</span><div className="row" style={{ gap: 6 }}>{LIP_FINISHES.map(s => <button key={s} type="button" className="chip" aria-pressed={cfg.lips!.finish === s} onClick={() => patchCfg({ lips: { ...cfg.lips!, finish: s } })}>{s}</button>)}</div></div>
              <Slider label="Intensity" value={cfg.lips.opacity} min={0.1} max={0.95} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patchCfg({ lips: { ...cfg.lips!, opacity: v } })} />
            </>)}
            {profile.renderMode === 'image_plane' && (<>
              {cfg.imagePlane?.url && <img src={cfg.imagePlane.url} alt="" style={{ width: 140, borderRadius: 12, background: 'var(--bg-2)' }} />}
              <Uploader kind="image" accept="image/png,image/webp" label="Upload transparent garment PNG" help="Front view, shoulders at the top edge" onDone={(a) => patchCfg({ imagePlane: { url: a.url, widthScale: cfg.imagePlane?.widthScale ?? 1.3 } })} />
              {cfg.imagePlane && <Slider label="Width" value={cfg.imagePlane.widthScale} min={0.3} max={3} step={0.01} fmt={(v) => `${v.toFixed(2)}×`} onChange={(v) => patchCfg({ imagePlane: { ...cfg.imagePlane!, widthScale: v } })} />}
            </>)}
            <VariantEditor variants={variants} setVariants={(v) => { setVariants(v); setSaved(null); }} renderMode={profile.renderMode} materials={materials.length ? materials : asset?.materials || []} previewIdx={variantPreview} setPreviewIdx={setVariantPreview} />
          </>)}

          {step === 4 && (
            <div className="stack" style={{ gap: 14, alignItems: 'flex-start' }}>
              <h2 style={{ fontSize: 24 }}>Preview in real AR</h2>
              <p className="muted">This opens your camera and runs the exact Skinner your customers will get — with your current (unsaved) settings. Previews are not counted in analytics.</p>
              {validateStep(3) ? <div className="alert alert-warn">{validateStep(3)}</div> : <button className="btn btn-xl try-btn" onClick={() => setPreview(true)}><span className="lens" />Start live preview</button>}
              <p className="small faint">No camera on this computer? Save the draft and open the full-screen preview on your phone: sign in there and go to My Skinners → Preview in AR.</p>
            </div>
          )}

          {step === 5 && (
            <div className="stack" style={{ gap: 14 }}>
              <h2 style={{ fontSize: 24 }}>Publish</h2>
              <ul className="stack" style={{ gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
                {[['Product name & category', !!p.name && !!p.category], ['At least one product image', p.images.length > 0], [needsModel ? '3D model attached' : profile.renderMode === 'image_plane' ? 'Garment image uploaded' : 'Design configured', needsModel ? !!assetId : profile.renderMode === 'image_plane' ? !!cfg.imagePlane?.url : true], ['Store link (optional)', !!p.purchaseUrl]].map(([l, ok]) => <li key={String(l)} className="row small" style={{ gap: 10 }}><span className={`badge ${ok ? 'badge-success' : String(l).includes('optional') ? '' : 'badge-danger'}`}>{ok ? '✓' : String(l).includes('optional') ? '–' : '!'}</span>{l}</li>)}
              </ul>
              <p className="small muted">Publishing makes the Skinner live on its public link, in SKINIFY discovery and search, and in embeds. Your plan’s limits are checked on the server.</p>
              <div className="row"><button className="btn btn-iris btn-lg" onClick={publish} disabled={busy}>{busy ? 'Publishing…' : status === 'published' ? 'Save & keep live' : 'Publish Skinner'}</button>{status === 'published' && linkSlug && <button className="btn btn-ghost" onClick={() => setStep(6)}>View link</button>}</div>
            </div>
          )}

          {step === 6 && linkSlug && (
            <div className="stack" style={{ gap: 14 }}>
              <div className="row"><span className="badge badge-success">Live</span><h2 style={{ fontSize: 24 }}>Your Skinner is ready to share</h2></div>
              <LinkPanel slug={linkSlug} name={p.name} canEmbed={canEmbed} />
              <div className="row" style={{ flexWrap: 'wrap' }}><Link className="btn btn-primary" href="/dashboard/skinners">Back to My Skinners</Link><Link className="btn btn-ghost" href="/dashboard/skinners/new">Create another</Link></div>
            </div>
          )}

          {step < 5 && (
            <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              {step > 0 && <button className="btn btn-ghost" onClick={() => go(step - 1)}><I.back size={16} />Back</button>}<span className="spacer" />
              <button className="btn btn-primary" onClick={() => go(step + 1)}>Continue <I.arrow size={16} /></button>
            </div>
          )}
        </div>

        {step >= 1 && step <= 3 && (
          <div className="card" style={{ position: 'sticky', top: 20, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'radial-gradient(70% 60% at 50% 40%, #fff, #efe9ff 60%, #f6e3ea)' }}>
              {(needsModel && asset) || nailsPreview ? (
                <Viewer3D key={`${asset?.url}-${profileKey}`} url={needsModel ? asset?.url : null} nails={nailsPreview} config={cfg} overrides={vOverride} reference autoRotate={false} style={{ position: 'absolute', inset: 0 }} onInfo={(i) => setMaterials(i.materials)} label="3D placement preview" />
              ) : <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }} className="small muted">{profile.renderMode === 'lips' ? <span><span style={{ display: 'inline-block', width: 80, height: 34, borderRadius: '50%', background: cfg.lips?.color, opacity: cfg.lips?.opacity }} /><br />Lip colour is applied live over the camera image.</span> : profile.renderMode === 'image_plane' ? (cfg.imagePlane?.url ? <img src={cfg.imagePlane.url} alt="" style={{ maxHeight: '80%' }} /> : 'Upload a garment image') : 'Choose or upload a 3D model to see it here'}</div>}
              <span className="badge badge-ar" style={{ position: 'absolute', top: 14, left: 14 }}><i />{profile.name} · {profile.anchor} anchor</span>
            </div>
            <div className="tiny muted" style={{ padding: 12 }}>The translucent shape is a reference {profile.anchor === 'finger' ? 'finger' : profile.anchor === 'wrist' ? 'wrist' : profile.tracker === 'face' ? 'head' : 'body part'} at typical adult size. Drag to orbit.</div>
          </div>
        )}
      </div>
      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <ARExperience data={previewData} preview autoStart />
          <button className="btn btn-sm" style={{ position: 'fixed', zIndex: 300, right: 14, bottom: 'calc(120px + env(safe-area-inset-bottom))', background: '#fff' }} onClick={() => setPreview(false)}>Exit preview</button>
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return <label className="field"><span className="row"><span className="label">{label}</span><span className="spacer" /><span className="small muted tabular">{fmt(value)}</span></span><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
function Toggle({ label, help, on, set }: { label: string; help?: string; on: boolean; set: (v: boolean) => void }) {
  return <div className="row"><div style={{ flex: 1 }}><div className="label">{label}</div>{help && <div className="help">{help}</div>}</div><button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => set(!on)} /></div>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return <label className="field"><span className="label">{label}</span><div className="row"><input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} style={{ width: 48, height: 40, border: 0, background: 'none' }} /><input className="input" style={{ width: 120 }} value={value} onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && onChange(e.target.value.toUpperCase())} /></div></label>;
}

function VariantEditor({ variants, setVariants, renderMode, materials, previewIdx, setPreviewIdx }: { variants: WizardInitial['variants']; setVariants: (v: WizardInitial['variants']) => void; renderMode: string; materials: string[]; previewIdx: number; setPreviewIdx: (i: number) => void }) {
  const upd = (i: number, v: WizardInitial['variants'][number]) => setVariants(variants.map((x, j) => j === i ? v : x));
  const add = () => setVariants([...variants, { name: `Option ${variants.length + 1}`, color_hex: '#C9A15B', ar_overrides: renderMode === 'nails' ? { nails: { color: '#C9A15B' } } : renderMode === 'lips' ? { lips: { color: '#C9A15B' } } : materials[0] ? { materials: { [materials[0]]: { color: '#C9A15B' } } } : {} }]);
  const setColor = (i: number, c: string) => {
    const v = variants[i]; const mat = Object.keys(v.ar_overrides.materials || {})[0] || materials[0];
    const ov: VariantOverrides = renderMode === 'nails' ? { ...v.ar_overrides, nails: { ...(v.ar_overrides.nails || {}), color: c } } : renderMode === 'lips' ? { ...v.ar_overrides, lips: { ...(v.ar_overrides.lips || {}), color: c } } : mat ? { materials: { ...(v.ar_overrides.materials || {}), [mat]: { ...(v.ar_overrides.materials?.[mat] || {}), color: c } } } : {};
    upd(i, { ...v, color_hex: c, ar_overrides: ov });
  };
  if (renderMode === 'image_plane') return null;
  return (
    <div className="field" style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
      <div className="row"><span className="label">Variants</span><span className="help">Customers switch these live in AR</span><span className="spacer" /><button type="button" className="btn btn-ghost btn-sm" onClick={add} disabled={variants.length >= 12}><I.plus size={14} />Add</button></div>
      {variants.map((v, i) => {
        const mat = Object.keys(v.ar_overrides.materials || {})[0] || '';
        return (
          <div key={i} className="row" style={{ gap: 8, flexWrap: 'wrap', padding: 8, borderRadius: 12, background: previewIdx === i ? 'var(--lilac)' : 'var(--surface-2)' }}>
            <input type="color" value={v.color_hex || '#cccccc'} onChange={(e) => setColor(i, e.target.value.toUpperCase())} style={{ width: 36, height: 32, border: 0, background: 'none' }} aria-label="Variant colour" />
            <input className="input" style={{ flex: 1, minWidth: 120, minHeight: 36, padding: '6px 10px' }} value={v.name} maxLength={40} onChange={(e) => upd(i, { ...v, name: e.target.value })} aria-label="Variant name" />
            {renderMode === 'model' && materials.length > 0 && <select className="select" style={{ width: 130, minHeight: 36, padding: '6px 10px' }} value={mat} onChange={(e) => { const c = v.color_hex || '#cccccc'; upd(i, { ...v, ar_overrides: { materials: { [e.target.value]: { ...(v.ar_overrides.materials?.[mat] || {}), color: c } } } }); }} aria-label="Material to recolour">{materials.map(m => <option key={m} value={m}>{m}</option>)}</select>}
            {renderMode === 'nails' && <select className="select" style={{ width: 120, minHeight: 36, padding: '6px 10px' }} value={v.ar_overrides.nails?.finish || ''} onChange={(e) => upd(i, { ...v, ar_overrides: { ...v.ar_overrides, nails: { ...(v.ar_overrides.nails || {}), ...(e.target.value ? { finish: e.target.value as 'gloss' } : {}) } } })} aria-label="Finish"><option value="">same finish</option>{NAIL_FINISHES.map(f => <option key={f}>{f}</option>)}</select>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreviewIdx(previewIdx === i ? -1 : i)}>{previewIdx === i ? 'Previewing' : 'Preview'}</button>
            <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Remove variant" onClick={() => { setVariants(variants.filter((_, j) => j !== i)); setPreviewIdx(-1); }}><I.close size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}
