import { redirect } from 'next/navigation';

export default function LegacyOnboardingSignRedirectPage() {
    redirect('/apply/status');
}
