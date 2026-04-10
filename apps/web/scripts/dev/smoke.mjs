import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

async function fetchRoute(route, cookies) {
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const res = await fetch(`${BASE_URL}${route}`, {
        headers: { Cookie: cookieHeader },
        redirect: 'manual'
    });
    return { status: res.status, url: res.url, headers: res.headers };
}

async function run() {
    console.log("=== Bounded Smoke Test ===");
    
    // 1. Logged out
    console.log("\n[Logged out]");
    let res = await fetchRoute('/apply/contracts', []);
    console.log(`GET /apply/contracts -> ${res.status} (expected 30x redirect to /login)`);
    if(res.status < 300 || res.status >= 400 || !res.headers.get('location')?.includes('/login')) {
      console.error(`FAIL: expected redirect to login, got ${res.status} location: ${res.headers.get('location')}`);
    } else {
      console.log(`PASS: redirect to ${res.headers.get('location')}`);
    }

    // 2. Logged in admission user
    const statefulInput = JSON.parse(fs.readFileSync('./playwright/.auth/state.stateful.json', 'utf8'));
    const statefulCookies = statefulInput.cookies;
    
    console.log("\n[Logged-in admission user]");
    const routes = [
       '/apply/status',
       '/apply/contracts',
       '/apply/contracts/fraud-penalty',
       '/apply/contracts/intelligence-monitoring',
       '/dashboard'
    ];
    for (const route of routes) {
        let res = await fetchRoute(route, statefulCookies);
        console.log(`GET ${route} -> ${res.status} location: ${res.headers.get("location") || ""}`);
        if(res.status === 500 || res.status === 404) {
             console.error(`FAIL: got ${res.status}`);
        } else {
             console.log(`PASS`);
        }
    }

    // 3. Admin user
    const coreInput = JSON.parse(fs.readFileSync('./playwright/.auth/state.core.json', 'utf8'));
    const coreCookies = coreInput.cookies;

    console.log("\n[Admin user]");
    res = await fetchRoute('/admin/governance', coreCookies);
    console.log(`GET /admin/governance -> ${res.status}`);
    if(res.status === 500) console.error("FAIL");
}

run().catch(console.error);
