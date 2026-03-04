import fs from 'fs';
import path from 'path';

/**
 * Beautiful Mind MVP
 * 규칙: 법무 텍스트는 오직 docs/legal 폴더에서 원본 파일을 읽어와서 렌더링해야 함.
 * 이 유틸리티는 이를 강제하기 위한 기본 세팅입니다.
 */

const LEGAL_DOCS_PATH = path.resolve(process.cwd(), '../../docs/legal');

export function getLegalText(fileName: string): string {
    const filePath = path.join(LEGAL_DOCS_PATH, fileName);

    // 보안 검증: docs/legal 디렉토리를 벗어나는 접근 차단 (Directory traversal 방지)
    if (!filePath.startsWith(LEGAL_DOCS_PATH)) {
        throw new Error('Access denied: You can only read files from docs/legal directory.');
    }

    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        console.error(`Error reading legal file ${fileName}:`, error);
        return '해당 법무 문서를 찾을 수 없습니다.';
    }
}

export const getTermsOfService = () => getLegalText('terms.md');
export const getPrivacyPolicy = () => getLegalText('privacy.md');

// 핵심 비즈니스 로직 Export
export * from './status';
