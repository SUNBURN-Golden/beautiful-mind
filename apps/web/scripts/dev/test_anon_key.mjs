import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing URL:', url);
console.log('Testing KEY:', anonKey);

const supabase = createClient(url, anonKey);

async function testAuth() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'portone.test.1771824209879@example.com',
        password: 'SecurePassword123!'
    });
    if (error) {
        console.error('Auth Error:', error.message);
    } else {
        console.log('Success!', data.user.id);
    }
}
testAuth();
