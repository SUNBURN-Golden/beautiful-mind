import fs from 'fs';
import path from 'path';

/**
 * SoulBound MVP
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

export {
    STATUS_BLOCKER_CODES,
    isStatusBlockerCode,
    type StatusBlockerCode,
} from './contracts/status-codes';

export {
    ADMISSION_STAGES,
    LEGACY_ADMISSION_STAGE_ALIASES,
    LEGACY_ADMISSION_STAGE_CODES,
    isAdmissionStage,
    isLegacyAdmissionStageCode,
    normalizeAdmissionStage,
    type AdmissionStage,
    type LegacyAdmissionStageCode,
} from './contracts/status-stages';

export {
    STATUS_DECISION_REASON_CODES,
    isStatusDecisionReasonCode,
    type StatusDecisionReasonCode,
} from './contracts/status-reasons';
