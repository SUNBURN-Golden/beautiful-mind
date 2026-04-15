import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = process.cwd();

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('match page keeps loading, non-active gate, empty, and recovery states stable', () => {
    const surface = read('components/surfaces/match-surface.tsx');
    const copy = read('i18n/match.ts');

    assert.match(surface, /PageLoadingState/);
    assert.match(surface, /title=\{copy\.loading\.title\}/);
    assert.match(surface, /description=\{copy\.loading\.description\}/);
    assert.match(copy, /Preparing your match space/);
    assert.match(copy, /We are syncing ACTIVE access and candidate signals\./);

    assert.match(surface, /StageTransitionNotice/);
    assert.match(surface, /title=\{copy\.gate\.title\}/);
    assert.match(surface, /description=\{copy\.gate\.description\}/);
    assert.match(copy, /This area is available to ACTIVE members/);
    assert.match(copy, /Match discovery opens after admission approval and SOUL credential issuance\./);

    assert.match(surface, /RecoverableErrorPanel/);
    assert.match(surface, /title=\{copy\.error\.title\}/);
    assert.match(surface, /retryLabel=\{copy\.refresh\.retry\}/);
    assert.match(surface, /secondaryHref=\{withLangQuery\('\/dashboard', locale, LIVE_DEFAULT_LOCALE\)\}/);
    assert.match(copy, /We couldn’t refresh your candidate feed/);
    assert.match(copy, /Refresh feed/);

    assert.match(surface, /FeedbackPanel/);
    assert.match(surface, /title=\{copy\.empty\.title\}/);
    assert.match(surface, /copy\.refresh\.retry/);
    assert.match(surface, /copy\.refresh\.viewStatus/);
    assert.match(copy, /No candidates are visible yet/);
    assert.match(copy, /View Status/);
});

test('match page keeps transparent ranking language grounded in visible sync signals', () => {
    const surface = read('components/surfaces/match-surface.tsx');
    const copy = read('i18n/match.ts');
    const page = read('app/match/page.tsx');

    assert.match(surface, /copy\.intro\.note/);
    assert.match(surface, /copy\.intro\.description/);
    assert.match(copy, /Transparency note: ranking context in this view is limited to visible trust signal, status, and feed order returned by the current sync\./);
    assert.match(copy, /A calm shortlist of verified candidates, presented in your latest sync order\./);
    assert.match(page, /const connectionLabel = source === 'ADAPTER' \? copy\.connectionLabels\.adapter : copy\.connectionLabels\.live/);
});

test('match cards keep hierarchy: reason chip, signal summary, explanation block, and CTA framing', () => {
    const surface = read('components/surfaces/match-surface.tsx');
    const copy = read('i18n/match.ts');

    assert.match(surface, /topReasonLabel\(index, copy\)/);
    assert.match(surface, /CardTitle className="sb-match-card-title text-\[22px\] font-semibold">\{match\.name\}<\/CardTitle>/);
    assert.match(surface, /signalSummary\(match\.trustSignal, copy\)[\s\S]*match\.updatedLabel/);
    assert.match(surface, /\{match\.statusLabel\}/);

    assert.match(surface, /title=\{copy\.labels\.referenceTitle\}/);
    assert.match(surface, /label: copy\.labels\.summaryLabel, value: copy\.labels\.summaryValue/);
    assert.match(surface, /label: copy\.labels\.trustSignal, value: <>\{formatSignal\(match\.trustSignal, copy\.labels\.signalUnavailable\)\}<\/>/);
    assert.match(surface, /label: copy\.labels\.status, value: match\.statusLabel/);
    assert.match(surface, /label: copy\.labels\.feedPosition, value: <>#\{index \+ 1\}<\/>/);

    assert.match(surface, /copy\.labels\.visibleSignals/);
    assert.match(surface, /\{match\.tags\.map\(\(tag\) => \(/);
    assert.match(surface, /copy\.labels\.openConversation/);
    assert.match(surface, /copy\.labels\.supportNote/);
    assert.match(copy, /Why this appears now/);
    assert.match(copy, /This placement reflects your current sync snapshot\./);
    assert.match(copy, /Open Conversation/);
});

test('match page keeps chat CTA route wiring stable for action confidence', () => {
    const page = read('app/match/page.tsx');

    assert.match(page, /const handleChat = \(match: MatchSurfaceItem\) => \{/);
    assert.match(page, /router\.push\(withLangQuery\(`\/chat\?matchId=\$\{encodeURIComponent\(match\.id\)\}&partnerName=\$\{encodeURIComponent\(match\.name\)\}`,\s*locale,\s*LIVE_DEFAULT_LOCALE\)\)/);
});

test('match page keeps route-side presentational mapping deterministic and explicit', () => {
    const page = read('app/match/page.tsx');

    assert.match(page, /const copy = getMatchCopy\(locale\)/);
    assert.match(page, /const uiMatches: MatchSurfaceItem\[\] = matches\.map\(\(match: MatchCandidate\) => \(\{/);
    assert.match(page, /updatedLabel: formatMatchUpdatedLabel\(locale, match\.updatedAt\)/);
});

test('signal summary copy tiers remain concise and deterministic', () => {
    const surface = read('components/surfaces/match-surface.tsx');
    const copy = read('i18n/match.ts');

    assert.match(surface, /function signalSummary\(signal: number \| null, copy: ReturnType<typeof getMatchCopy>\): string/);
    assert.match(copy, /pending: 'Signal pending'/);
    assert.match(copy, /high: 'High-confidence signal'/);
    assert.match(copy, /solid: 'Solid signal'/);
    assert.match(copy, /early: 'Early signal'/);
});
