import { redirect } from 'next/navigation';

export default function LegacyOsintRedirectPage() {
    redirect('/apply/status');
}
