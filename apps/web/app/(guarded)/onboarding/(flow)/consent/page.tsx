import { redirect } from 'next/navigation';

export default function LegacyOnboardingConsentRedirectPage() {
    redirect('/apply/status');
}
