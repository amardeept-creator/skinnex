import { SavedList } from '@/components/SavedList';
export const metadata = { title: 'Saved' };
export default function Saved() {
  return (
    <div className="container" style={{ paddingBlock: '32px 40px' }}>
      <div className="eyebrow">Stored on this device — no account needed</div>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', marginTop: 8, marginBottom: 24 }}>Saved</h1>
      <SavedList />
    </div>
  );
}
