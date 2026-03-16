import test from 'node:test';
import assert from 'node:assert/strict';

test('active-features entrypoint preserves orchestration exports', async () => {
    const mod = await import('../../lib/server/active-features.ts');

    assert.equal(typeof mod.listActiveMatches, 'function');
    assert.equal(typeof mod.listChatMessages, 'function');
    assert.equal(typeof mod.sendChatMessage, 'function');
    assert.equal(typeof mod.completeActiveMeeting, 'function');
    assert.equal(typeof mod.submitActiveIncidentReport, 'function');
    assert.equal(typeof mod.submitParticipationRevokeRequest, 'function');
});
