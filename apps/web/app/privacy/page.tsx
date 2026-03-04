import fs from 'node:fs/promises';
import path from 'node:path';

async function readLegal(fileName: string): Promise<string> {
    const baseDir = path.resolve(process.cwd(), '../../docs/legal');
    const fullPath = path.resolve(baseDir, fileName);

    if (!fullPath.startsWith(baseDir)) {
        return '문서 경로가 유효하지 않습니다.';
    }

    try {
        return await fs.readFile(fullPath, 'utf8');
    } catch {
        return '개인정보 처리방침 문서를 불러오지 못했습니다.';
    }
}

export default async function PrivacyPage() {
    const privacy = await readLegal('privacy.md');

    return (
        <main className="liquid-shell min-h-screen px-4 pb-12 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-4xl space-y-4">
                <header className="space-y-2">
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight">개인정보 처리방침</h1>
                    <p className="liquid-copy text-sm">SoulBound 서비스 운영을 위한 수집·이용·보관 정책을 안내합니다.</p>
                </header>
                <pre className="liquid-pane max-h-[75dvh] overflow-auto whitespace-pre-wrap rounded-2xl p-5 text-sm leading-7 text-[#3a3a3c] sm:p-6">
                    {privacy}
                </pre>
            </div>
        </main>
    );
}
