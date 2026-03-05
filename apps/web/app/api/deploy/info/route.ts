import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function shortCommit(commit: string | undefined): string | null {
    if (!commit || commit.length < 7) return null;
    return commit.slice(0, 7);
}

export async function GET() {
    const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
    const deployedAt = new Date().toISOString();

    return NextResponse.json({
        app: 'beautiful-mind-web',
        signature: 'soulbound-launch-ui-v3',
        commit: commit || null,
        commit_short: shortCommit(commit),
        env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
        region: process.env.VERCEL_REGION || null,
        url: process.env.VERCEL_URL || null,
        deployed_at_server_time: deployedAt,
    });
}
