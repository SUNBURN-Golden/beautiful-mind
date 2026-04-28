import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = path.resolve(process.cwd());

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('landing ordinary UI no longer renders raw build, commit, or receipt metadata', () => {
    const page = read('app/page.tsx');
    const surface = read('components/surfaces/landing-surface.tsx');
    const copy = read('i18n/landing.ts');
    const fixture = read('dev-fixtures/landing.fixture.ts');
    const ordinaryLandingSources = [page, surface, copy, fixture].join('\n');

    assert.doesNotMatch(ordinaryLandingSources, /commitShort/);
    assert.doesNotMatch(ordinaryLandingSources, /VERCEL_GIT_COMMIT_SHA/);
    assert.doesNotMatch(ordinaryLandingSources, /soulbound-launch-ui-v3/);
    assert.doesNotMatch(ordinaryLandingSources, /INV-5\.5-LANDING/);
    assert.doesNotMatch(ordinaryLandingSources, /stage5\.landing\.invitation\.v1/);
    assert.doesNotMatch(ordinaryLandingSources, /0x8b29c4d917f4a8e1d55a62b3c7145f09/);
    assert.doesNotMatch(surface, /ReceiptCard/);
});

test('landing headline is phrase-based and Korean-safe without changing locale routing', () => {
    const surface = read('components/surfaces/landing-surface.tsx');
    const copy = read('i18n/landing.ts');
    const localeSwitch = read('components/surfaces/locale-switch.tsx');

    assert.match(copy, /titlePhrases/);
    assert.match(copy, /'우리는'/);
    assert.match(copy, /'한 마디를 건네기 전에'/);
    assert.match(copy, /'약속을 적어둡니다\.'/);
    assert.match(surface, /copy\.titlePhrases\.map/);
    assert.match(surface, /\[word-break:keep-all\]/);
    assert.match(surface, /\[line-break:strict\]/);
    assert.match(surface, /LocaleSwitch/);
    assert.match(localeSwitch, /withLangQuery\(pathname, 'ko'/);
    assert.doesNotMatch(surface, /\/ko\//);
    assert.doesNotMatch(copy, /\/ko\//);
});

test('landing CTA destinations remain unchanged', () => {
    const surface = read('components/surfaces/landing-surface.tsx');

    assert.match(surface, /withLangQuery\('\/apply\/status', locale, LIVE_DEFAULT_LOCALE\)/);
    assert.match(surface, /withLangQuery\('\/signup', locale, LIVE_DEFAULT_LOCALE\)/);
    assert.match(surface, /withLangQuery\('\/login', locale, LIVE_DEFAULT_LOCALE\)/);
});
