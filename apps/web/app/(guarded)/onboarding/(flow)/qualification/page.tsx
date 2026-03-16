import { redirect } from 'next/navigation';

export default function LegacyOnboardingQualificationRedirectPage() {
    redirect('/apply/status');
}
