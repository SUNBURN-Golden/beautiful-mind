import { notFound } from 'next/navigation';
import { isTestRouteEnabled } from '@/lib/server/trust';
import RealtimeDebugClient from './realtime-debug-client';

export default function RealtimeDebugPage() {
    if (!isTestRouteEnabled()) {
        notFound();
    }

    return <RealtimeDebugClient />;
}
