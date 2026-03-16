import { redirect } from 'next/navigation';

export default function LegacyOnboardingVerifyRedirectPage() {
    redirect('/apply/status');
}
