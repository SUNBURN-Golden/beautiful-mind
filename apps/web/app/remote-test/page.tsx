import { notFound } from 'next/navigation';
import { isTestRouteEnabled } from '@/lib/server/trust';
import RemoteDbTestClient from './remote-test-client';

export default function RemoteTestPage() {
    if (!isTestRouteEnabled()) {
        notFound();
    }

    return <RemoteDbTestClient />;
}
