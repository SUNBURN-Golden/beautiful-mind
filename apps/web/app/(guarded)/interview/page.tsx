import { redirect } from 'next/navigation';

export default function LegacyInterviewRedirectPage() {
    redirect('/apply/status');
}
