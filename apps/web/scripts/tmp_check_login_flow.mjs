import { chromium } from '@playwright/test';

const base = 'https://soulboundtest2.vercel.app';
const email = 'admin@beautifulmind.com';
const password = 'adminPassword123!';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const out = { email, steps: [] };

  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
  out.steps.push({ step: 'open_login', url: page.url() });

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.click('button[type="submit"]')
  ]);

  out.steps.push({
    step: 'after_login_submit',
    url: page.url(),
    title: await page.title(),
    snippet: (await page.textContent('body'))?.slice(0, 400)
  });

  await page.goto(`${base}/onboarding`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  out.steps.push({
    step: 'open_onboarding_after_login',
    url: page.url(),
    title: await page.title(),
    snippet: (await page.textContent('body'))?.slice(0, 400)
  });

  console.log(JSON.stringify(out, null, 2));
} catch (e) {
  console.error('ERR', e);
} finally {
  await browser.close();
}
