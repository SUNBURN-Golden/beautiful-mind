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
        return '약관 문서를 불러오지 못했습니다.';
    }
}

export default async function TermsPage() {
    const terms = await readLegal('terms.md');

    return (
        <main className="liquid-shell min-h-screen px-4 pb-12 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-4xl space-y-4">
                <header className="space-y-2">
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight">서비스 이용약관</h1>
                    <p className="liquid-copy text-sm">서비스 이용 시 적용되는 권리·의무 및 책임 범위를 안내합니다.</p>
                </header>
                <pre className="liquid-pane max-h-[75dvh] overflow-auto whitespace-pre-wrap rounded-2xl p-5 text-sm leading-7 text-[#3a3a3c] sm:p-6">
                    {terms}
                </pre>
            </div>
        </main>
    );
}
