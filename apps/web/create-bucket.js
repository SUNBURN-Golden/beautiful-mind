/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
    console.error("Missing credentials in environment variables");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

async function createContractsBucket() {
    const { data, error } = await supabaseAdmin.storage.createBucket('contracts', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
    });

    if (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate key value')) {
            console.log('Bucket "contracts" already exists.');
        } else {
            console.error('Error creating bucket:', error.message);
        }
    } else {
        console.log('Bucket "contracts" created successfully.', data);
    }
}

createContractsBucket();
