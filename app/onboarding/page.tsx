import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function Onboarding() {
  redirect('/dashboard/skinners/new');
}
