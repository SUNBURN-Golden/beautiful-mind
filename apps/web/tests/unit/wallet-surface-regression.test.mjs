import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const { getWalletCopy } = await import('../../i18n/wallet.ts');

const WEB_ROOT = path.resolve(process.cwd());

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('wallet empty state claims welcome SOUL through canonical airdrop route only', () => {
    const surface = read('components/surfaces/wallet-surface.tsx');

    assert.match(surface, /fetch\('\/api\/airdrop\/claim'/);
    assert.match(surface, /method:\s*'POST'/);
    assert.match(surface, /const nextWallet = await loadWallet\(\)/);
    assert.match(surface, /setData\(nextWallet\)/);
    assert.doesNotMatch(surface, /from\('token_ledger'\)/);
    assert.doesNotMatch(surface, /claimSoulAirdrop/);
});

test('wallet copy exposes bilingual welcome SOUL claim labels', () => {
    const en = getWalletCopy('en');
    const ko = getWalletCopy('ko');

    assert.equal(en.claimWelcomeLabel, 'Claim welcome SOUL');
    assert.equal(en.claimingWelcomeLabel, 'Claiming welcome SOUL');
    assert.equal(ko.claimWelcomeLabel, '웰컴 SOUL 받기');
    assert.equal(ko.claimingWelcomeLabel, '웰컴 SOUL 받는 중');
});
