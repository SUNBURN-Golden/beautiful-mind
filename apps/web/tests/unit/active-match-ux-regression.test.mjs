import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = process.cwd();

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('match page keeps loading, non-active gate, empty, and recovery states stable', () => {
    const page = read('app/match/page.tsx');

    assert.match(page, /PageLoadingState/);
    assert.match(page, /title="Preparing your match space"/);
    assert.match(page, /description="We are syncing ACTIVE access and candidate signals\."?/);

    assert.match(page, /StageTransitionNotice/);
    assert.match(page, /title="This area is available to ACTIVE members"/);
    assert.match(page, /Match discovery opens after admission approval and SOUL credential issuance\./);

    assert.match(page, /RecoverableErrorPanel/);
    assert.match(page, /title="We couldn’t refresh your candidate feed"/);
    assert.match(page, /retryLabel="Refresh feed"/);
    assert.match(page, /secondaryHref="\/dashboard"/);

    assert.match(page, /FeedbackPanel/);
    assert.match(page, /title="No candidates are visible yet"/);
    assert.match(page, /Refresh feed/);
    assert.match(page, /View Status/);
});

test('match page keeps transparent ranking language grounded in visible sync signals', () => {
    const page = read('app/match/page.tsx');

    assert.match(page, /Transparency note: ranking context in this view is limited to visible trust signal, status, and feed order returned by the current sync\./);
    assert.match(page, /A calm shortlist of verified candidates, presented in your latest sync order\./);
    assert.match(page, /const sourceLabel = source === 'ADAPTER' \? 'Continuity mode' : 'Live sync'/);
});

test('match cards keep hierarchy: reason chip, signal summary, explanation block, and CTA framing', () => {
    const page = read('app/match/page.tsx');

    assert.match(page, /topReasonLabel\(index\)/);
    assert.match(page, /CardTitle className="text-\[22px\] font-semibold text-\[#1d1d1f\]">\{match\.name\}<\/CardTitle>/);
    assert.match(page, /signalSummary\(match\.trustSignal\)[\s\S]*formatUpdatedAt\(match\.updatedAt\)/);
    assert.match(page, /\{match\.statusLabel\}/);

    assert.match(page, /Why this appears now/);
    assert.match(page, /This placement reflects your current sync snapshot\./);
    assert.match(page, /Trust Signal/);
    assert.match(page, /Status/);
    assert.match(page, /Feed position/);
    assert.match(page, /\{formatSignal\(match\.trustSignal\)\}/);
    assert.match(page, /#\{index \+ 1\}/);

    assert.match(page, /Visible trust signals/);
    assert.match(page, /\{match\.tags\.map\(\(tag\) => \(/);
    assert.match(page, /Open Conversation/);
    assert.match(page, /If anything feels off, you can file a report at any point in the conversation\./);
});

test('match page keeps chat CTA route wiring stable for action confidence', () => {
    const page = read('app/match/page.tsx');

    assert.match(page, /const handleChat = \(match: MatchCandidate\) => \{/);
    assert.match(page, /router\.push\(`\/chat\?matchId=\$\{encodeURIComponent\(match\.id\)\}&partnerName=\$\{encodeURIComponent\(match\.name\)\}`\)/);
});

test('signal summary copy tiers remain concise and deterministic', () => {
    const page = read('app/match/page.tsx');

    assert.match(page, /function signalSummary\(signal: number \| null\): string/);
    assert.match(page, /if \(signal === null\) return 'Signal pending'/);
    assert.match(page, /if \(signal >= 100\) return 'High-confidence signal'/);
    assert.match(page, /if \(signal >= 80\) return 'Solid signal'/);
    assert.match(page, /return 'Early signal'/);
});
