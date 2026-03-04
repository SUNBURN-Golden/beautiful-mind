import { chromium } from 'playwright';
import { resolve } from 'path';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('[1] Normal User Access Denied Test');
    await page.goto('http://localhost:3000/api/dev-login?email=e2e.test.1771894040351@example.com');
    await page.waitForTimeout(2000);
    await page.goto('http://localhost:3000/admin');
    await page.waitForTimeout(1000);
    const url = page.url();
    console.log(`Navigated to /admin, current URL: ${url}`);
    if (url.includes('/admin')) {
        console.log('FAIL: Normal user accessed admin page');
    } else {
        console.log('PASS: Normal user blocked from admin page');
    }

    console.log('[2] Admin Access & Legal Evidence Export Test');
    await page.goto('http://localhost:3000/api/dev-login?email=justice.parkit@gmail.com');
    await page.waitForTimeout(2000); // Wait for login redirect

    // Go to user detail page
    const userId = '6e2b1d53-282f-4604-98bc-3a765a993d38';
    await page.goto(`http://localhost:3000/admin/users/${userId}`);
    await page.waitForSelector('text=User Details', { timeout: 10000 });

    console.log('Taking screenshot of User Detail Page (Legal Evidence + Ban Button)');
    const screenshotPath = resolve(process.cwd(), 'admin_user_detail.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);

    // Test API Export download
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.click('text=법적 증거 추출');
    const download = await downloadPromise;
    if (download) {
        console.log(`PASS: Legal Evidence Package downloaded: ${download.suggestedFilename()}`);
    } else {
        console.log('ERROR: Download event not triggered.');
    }

    console.log('[3] Admin Ban Workflow Test');
    page.on('dialog', async dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        if (dialog.type() === 'confirm') {
            await dialog.accept();
        } else if (dialog.type() === 'prompt') {
            await dialog.accept('Test Ban for Abuse');
        } else {
            await dialog.accept();
        }
    });

    await page.click('button:has-text("강제 차단 (Ban)")');
    await page.waitForTimeout(2000);
    console.log('Ban action submitted via dialogs.');

    await browser.close();
})();
