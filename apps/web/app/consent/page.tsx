import { redirect } from 'next/navigation';

export default function LegacyConsentRedirectPage() {
    redirect('/apply/status');
}
