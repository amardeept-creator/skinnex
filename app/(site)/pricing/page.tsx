import { listPlans } from '@/lib/server/entitlements';
import { PlanCards } from '@/components/PlanCards';
export const metadata = { title: 'Pricing' };
export default async function Pricing() {
  const plans = await listPlans();
  return (
    <div className="container" style={{ paddingBlock: '40px' }}>
      <div className="eyebrow">Plans for brands</div>
      <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', marginTop: 8 }}>Simple plans. Your Skinners stay safe.</h1>
      <p className="muted" style={{ marginTop: 12, maxWidth: 640, fontSize: 16 }}>Every plan starts with a free trial. If a plan ends, your Skinners go inactive — products, 3D assets and settings are kept, and everything comes back the moment you renew.</p>
      <div style={{ marginTop: 32 }}><PlanCards plans={plans} /></div>
      <p className="tiny faint" style={{ marginTop: 18 }}>Plans and limits are configured in the database (subscription_plans) and editable by SKINIFY admins — nothing is hard-coded. Online card payments are enabled when Stripe is configured.</p>
    </div>
  );
}
