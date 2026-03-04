import { POST } from '../app/api/integrity/merkle-snapshot/route.ts';

async function run() {
    try {
        const req = new Request('http://localhost:3000/api/integrity/merkle-snapshot', { method: 'POST' });
        const res = await POST(req);
        const data = await res.json();
        console.log('Merkle Snapshot API Response:');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error running snapshot:', err);
    }
}

run();
