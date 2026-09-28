export const metadata = { title: 'Camera privacy' };
export default function Privacy() {
  const items = [
    ['Processed on your device', 'Camera frames are analysed by MediaPipe models running in your browser (WebAssembly / WebGL). No video frame is sent to SKINIFY or to the brand.'],
    ['Nothing is recorded by default', 'Photos and videos exist only when you press capture, and they stay on your device unless you choose to share or save them.'],
    ['You control the camera', 'Close AR or leave the tab and the camera is released immediately. You can revoke permission any time in browser settings.'],
    ['What we do measure', 'Anonymous interaction events (e.g. “Skinner opened”, “try-on”, “share tapped”, device type) so brands can see how their Skinners perform. No images, faces, or landmarks are stored.'],
    ['Model downloads', 'The tracking models are downloaded from Google’s public model storage (storage.googleapis.com) the first time you open a Skinner and are cached by your browser.'],
  ];
  return (
    <div className="container" style={{ padding: '40px 0', maxWidth: 820 }}>
      <div className="eyebrow">Trust</div>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', marginTop: 8 }}>Your camera stays yours.</h1>
      <div className="stack" style={{ gap: 14, marginTop: 28 }}>{items.map(([t, d]) => <div key={t} className="card card-pad"><h3 style={{ fontSize: 20 }}>{t}</h3><p className="muted" style={{ marginTop: 6 }}>{d}</p></div>)}</div>
    </div>
  );
}
