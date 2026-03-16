import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WEB_ROOT = process.cwd();

function read(filePath) {
    return fs.readFileSync(path.join(WEB_ROOT, filePath), 'utf8');
}

test('chat page keeps a calm loading fallback copy', () => {
    const page = read('app/chat/page.tsx');

    assert.match(page, /Opening secure conversation\.\.\./);
    assert.match(page, /Suspense fallback/);
});

test('chat client keeps optimistic sending lifecycle with visible retry path', () => {
    const hook = read('app/chat/chat-thread.ts');
    const sections = read('app/chat/ChatMessageList.tsx');

    assert.match(hook, /localState\?: 'sending' \| 'retry'/);
    assert.match(hook, /const optimisticMessage: ChatMessage/);
    assert.match(hook, /localState: 'sending'/);
    assert.match(hook, /setMessages\(\(previous\) => \[\.\.\.previous, optimisticMessage\]\)/);
    assert.match(hook, /entry\.id === localId[\s\S]*localState: 'retry'/);
    assert.match(hook, /handleRetryMessage/);
    assert.match(sections, /Sending…/);
    assert.match(sections, /Send failed/);
    assert.match(sections, />\s*Retry\s*</);
});

test('chat client keeps bounded live sync notices without fake realtime claims', () => {
    const hook = read('app/chat/chat-thread.ts');
    const page = read('app/chat/ChatClient.tsx');
    const combined = hook + page;

    assert.match(hook, /const POLL_INTERVAL_MS = 12000/);
    assert.match(hook, /if \(stage !== 'ACTIVE' \|\| !matchId\) return;/);
    assert.match(hook, /window\.setInterval\(\(\) => \{/);
    assert.match(hook, /Updates about every 12 seconds/);
    assert.match(hook, /Live updates paused\. Refresh to continue\./);
    assert.match(hook, /document\.visibilityState === 'visible'/);
    assert.match(hook, /window\.clearInterval\(timer\)/);
    assert.match(hook, /document\.removeEventListener\('visibilitychange', onVisibilityChange\)/);
    assert.doesNotMatch(combined, /typing/i);
    assert.doesNotMatch(combined, /read receipt/i);
    assert.doesNotMatch(combined, /delivered/i);
    assert.doesNotMatch(combined, /seen/i);
});

test('chat client keeps sticky scroll guard to avoid forced jump while reading', () => {
    const hook = read('app/chat/chat-thread.ts');
    const page = read('app/chat/ChatClient.tsx');

    assert.match(hook, /const STICKY_SCROLL_THRESHOLD = 96/);
    assert.match(hook, /distanceToBottom = listEl\.scrollHeight - listEl\.scrollTop - listEl\.clientHeight/);
    assert.match(hook, /stickToBottomRef\.current = distanceToBottom <= STICKY_SCROLL_THRESHOLD/);
    assert.match(hook, /if \(!stickToBottomRef\.current\) \{\s*return;\s*\}/);
    assert.match(page, /onScroll=\{updateStickyMode\}/);
    assert.match(hook, /scrollIntoView\(\{ behavior, block: 'end' \}\)/);
});

test('chat client merges server updates without dropping pending local retries', () => {
    const hook = read('app/chat/chat-thread.ts');

    assert.match(hook, /function mergeServerMessages\(previous: ChatMessage\[], incoming: ConversationMessage\[\]\): ChatMessage\[\]/);
    assert.match(hook, /const serverIds = new Set\(serverMessages\.map\(\(message\) => message\.id\)\)/);
    assert.match(hook, /const pendingLocal = previous\.filter\(\(message\) => message\.localState && !serverIds\.has\(message\.id\)\)/);
    assert.match(hook, /return \[\.\.\.serverMessages, \.\.\.pendingLocal\]/);
});

test('chat client keeps loading, empty, and recovery state panels stable', () => {
    const combined = read('app/chat/ChatClient.tsx') + read('app/chat/ChatMessageList.tsx') + read('app/chat/ChatComposer.tsx');

    assert.match(combined, /PageLoadingState/);
    assert.match(combined, /RecoverableErrorPanel/);
    assert.match(combined, /retryLabel="Reload Conversation"/);
    assert.match(combined, /FeedbackPanel/);
    assert.match(combined, /title="No messages yet"/);
    assert.match(combined, /title="A message is waiting to be sent"/);
    assert.match(combined, /Report Concern/);
    assert.match(combined, /Confirm Meeting/);
});

test('chat client keeps missing-context recovery and composer disable guards stable', () => {
    const combined = read('app/chat/ChatMessageList.tsx') + read('app/chat/ChatComposer.tsx');

    assert.match(combined, /title="Conversation context is missing"/);
    assert.match(combined, /This session has no match reference, so messaging is disabled\./);
    assert.match(combined, /disabled=\{isSending \|\| isCompletingMeet \|\| !matchId\}/);
    assert.match(combined, /disabled=\{isSending \|\| isCompletingMeet \|\| draft\.trim\(\)\.length === 0 \|\| !matchId\}/);
});
