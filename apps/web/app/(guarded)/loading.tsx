import { Skeleton } from '@/components/ui-kit';

export default function GuardedLoading() {
    return (
        <main className="mx-auto max-w-md px-4 pt-20 sm:px-6 sm:pt-24">
            <div className="liquid-pane rounded-3xl p-6">
                <Skeleton lines={4} />
            </div>
        </main>
    );
}
