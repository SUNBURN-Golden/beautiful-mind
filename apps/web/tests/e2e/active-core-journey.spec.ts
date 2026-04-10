import { expect, test } from '@playwright/test';
import { ADMISSION_STAGES } from '../../lib/contracts/status-stages';

const MOCK_MATCH_ID = '11111111-1111-4111-8111-111111111111';
const MOCK_PARTNER_ID = '22222222-2222-4222-8222-222222222222';
const MOCK_PARTNER_NAME = 'Jordan';
const OUTBOUND_MESSAGE = 'Appreciate the clear coordination on timing.';
const CHAT_SYNC_NOTICE = /Updates about every \d+ seconds\./;
const CHAT_SECURITY_NOTICE = /Messages are encrypted in transit/i;

test.describe('ACTIVE Core Journey', () => {
    test('@auth match to chat to report keeps core ACTIVE flow stable', async ({ page }) => {
        await page.goto('/dashboard');
        if (/\/login(\?.*)?$/.test(page.url())) {
            test.skip(true, 'Authenticated storage state is not available in this local environment.');
        }

        await page.route('**/api/me/status', async (route) => {
            await route.fulfill({
                status: 200,
                json: {
                    step: ADMISSION_STAGES.ACTIVE,
                    blockers: [],
                    meta: {
                        is_frozen: false,
                    },
                },
            });
        });

        await page.route('**/api/active/matches', async (route) => {
            await route.fulfill({
                status: 200,
                json: {
                    source: 'API',
                    data: [
                        {
                            id: MOCK_MATCH_ID,
                            partner_id: MOCK_PARTNER_ID,
                            partner_name: MOCK_PARTNER_NAME,
                            trust_signal: 112,
                            status: ADMISSION_STAGES.ACTIVE,
                            tags: ['Identity verified', 'High integrity'],
                            updated_at: '2026-03-11T00:00:00.000Z',
                        },
                    ],
                },
            });
        });

        await page.route(`**/api/active/chat/messages?match_id=${MOCK_MATCH_ID}`, async (route) => {
            if (route.request().method() !== 'GET') {
                await route.fallback();
                return;
            }
            await route.fulfill({
                status: 200,
                json: {
                    source: 'API',
                    data: {
                        match_id: MOCK_MATCH_ID,
                        partner_id: MOCK_PARTNER_ID,
                        partner_name: MOCK_PARTNER_NAME,
                        messages: [
                            {
                                id: 'seed-1',
                                sender: MOCK_PARTNER_NAME,
                                mine: false,
                                text: 'Thanks for making time today.',
                                sent_at: '2026-03-11T00:00:00.000Z',
                            },
                        ],
                    },
                },
            });
        });

        let postedMessage = '';
        await page.route('**/api/active/chat/messages', async (route) => {
            if (route.request().method() !== 'POST') {
                await route.fallback();
                return;
            }

            const body = route.request().postDataJSON() as { match_id?: string; content?: string };
            postedMessage = body.content || '';

            await new Promise((resolve) => setTimeout(resolve, 300));
            await route.fulfill({
                status: 200,
                json: {
                    source: 'API',
                    data: {
                        id: 'msg-2',
                        sender: 'You',
                        mine: true,
                        text: postedMessage,
                        sent_at: '2026-03-11T00:05:00.000Z',
                    },
                },
            });
        });

        await page.goto('/match');
        await expect(page.getByRole('heading', { name: 'Verified Connection Feed' })).toBeVisible();
        await expect(page.getByText('Why this appears now')).toBeVisible();
        const openConversationButton = page.getByRole('button', { name: 'Open Conversation' }).first();
        await expect(openConversationButton).toBeVisible();
        await openConversationButton.click();

        await expect(page).toHaveURL(/\/chat\?matchId=/);
        await expect(page.getByText(CHAT_SYNC_NOTICE)).toBeVisible();
        await expect(page.getByText(CHAT_SECURITY_NOTICE)).toBeVisible();

        await page.locator('#chat-draft-input').fill(OUTBOUND_MESSAGE);
        await page.getByRole('button', { name: /^Send$/ }).click();

        await expect(page.getByRole('button', { name: /Sending…|Sending\.\.\./ })).toBeDisabled();
        await expect.poll(() => postedMessage).toBe(OUTBOUND_MESSAGE);
        await expect(page.getByText(OUTBOUND_MESSAGE)).toBeVisible();
        await expect(page.getByText('Send failed')).not.toBeVisible();

        await page.getByRole('button', { name: 'Report Concern' }).click();
        await expect(page).toHaveURL(new RegExp(`/report\\?matchId=${MOCK_MATCH_ID}`));
        await expect(page.getByText('Safety Report')).toBeVisible();
        await expect(page.getByText('Linked context', { exact: true })).toBeVisible();
        await expect(page.getByText('Conversation ID')).toBeVisible();
        await expect(page.getByText(MOCK_MATCH_ID)).toBeVisible();
    });
});
