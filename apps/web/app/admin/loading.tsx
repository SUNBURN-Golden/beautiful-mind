import { Skeleton } from '@/components/ui-kit';

export default function AdminLoading() {
    return (
        <div className="p-8">
            <Skeleton lines={1} className="mb-8 h-10 w-1/4" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Skeleton lines={3} className="h-32 rounded-xl" />
                <Skeleton lines={3} className="h-32 rounded-xl" />
                <Skeleton lines={3} className="h-32 rounded-xl" />
            </div>
            <div className="mt-8">
                <Skeleton lines={8} className="h-64 shadow-sm" />
            </div>
        </div>
    );
}
