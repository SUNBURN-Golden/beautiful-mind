import { redirect } from 'next/navigation';

export default function LegacyAdminVerifyRedirectPage() {
    redirect('/admin/admissions');
}
