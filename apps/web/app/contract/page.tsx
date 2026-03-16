import { redirect } from 'next/navigation';

export default function LegacyContractRedirectPage() {
    redirect('/apply/status');
}
