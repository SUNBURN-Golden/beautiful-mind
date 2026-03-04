import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fcqsdfpbwqjpvpunrxdh.supabase.co";
const supabaseKey = "sb_secret_GF1fazFZDiH2pynDpcBwoA_brJqUYJS";
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkAdmin() {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    const adminUser = data.users.find(u => u.email === 'admin@beautifulmind.com');
    if (adminUser) {
        console.log("Admin user found:", adminUser.id);
        console.log("Created at:", adminUser.created_at);

        // Attempt to reset password
        const newPassword = "adminPassword123!";
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            adminUser.id,
            { password: newPassword }
        );

        if (updateError) {
            console.error("Failed to update password:", updateError);
        } else {
            console.log("Password successfully reset to:", newPassword);
        }
    } else {
        console.log("Admin user 'admin@beautifulmind.com' NOT found in FCQS.");
    }
}

checkAdmin().catch(console.error);
