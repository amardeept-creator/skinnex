import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
export const metadata = { title: 'Create account' };
export default function Signup() { return <Suspense><AuthForm mode="signup" /></Suspense>; }
