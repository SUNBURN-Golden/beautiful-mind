import { Suspense } from 'react';
import { PageLoadingState } from '@/components/ui-kit';
import ReportClient from './ReportClient';

export const dynamic = 'force-dynamic';

export default function ReportPage() {
    return (
        <Suspense fallback={(
            <PageLoadingState
                title="Preparing the report workspace"
                description="We are verifying ACTIVE access and loading the reporting surface."
                lines={4}
            />
        )}>
            <ReportClient />
        </Suspense>
    );
}
