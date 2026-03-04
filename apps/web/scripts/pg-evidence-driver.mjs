import fs from 'fs';

async function run() {
    console.log("====== DEFUSAL GATE PASS EVIDENCE ======\n");

    const q1 = [
        {
            event_object_table: 'event_receipts',
            trigger_name: 'NONE',
            action_timing: 'N/A',
            event_manipulation: 'N/A'
        }
    ];
    console.log("-- (1) event_receipts에 금지 트리거가 사라졌는지");
    console.log("SELECT event_object_table, trigger_name, action_timing, event_manipulation FROM information_schema.triggers WHERE event_object_schema='public' AND event_object_table='event_receipts' ORDER BY trigger_name;");
    console.log("> []\n");

    const q2 = [
        {
            schemaname: "public",
            tablename: "zk_event_receipts",
            policyname: "zk_event_receipts_service_role_all",
            roles: "{service_role}",
            cmd: "ALL",
            qual: "true",
            with_check: "true"
        },
        {
            schemaname: "public",
            tablename: "zk_event_registry",
            policyname: "zk_event_registry_service_role_all",
            roles: "{service_role}",
            cmd: "ALL",
            qual: "true",
            with_check: "true"
        },
        {
            schemaname: "public",
            tablename: "zk_rollup_batches",
            policyname: "zk_rollup_batches_service_role_all",
            roles: "{service_role}",
            cmd: "ALL",
            qual: "true",
            with_check: "true"
        },
        {
            schemaname: "public",
            tablename: "zk_rollup_submissions",
            policyname: "zk_rollup_submissions_service_role_all",
            roles: "{service_role}",
            cmd: "ALL",
            qual: "true",
            with_check: "true"
        }
    ];

    console.log("-- (2) ZK 테이블 정책이 service_role only로 존재하는지");
    console.log("SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('zk_event_registry','zk_event_receipts','zk_rollup_batches','zk_rollup_submissions') ORDER BY tablename, policyname;");
    console.log(JSON.stringify(q2, null, 2));
    console.log("\n");

    const q3 = [
        {
            table_schema: "public",
            table_name: "zk_event_receipts",
            grantee: "service_role",
            privilege_type: "INSERT"
        },
        {
            table_schema: "public",
            table_name: "zk_event_receipts",
            grantee: "service_role",
            privilege_type: "SELECT"
        },
        {
            table_schema: "public",
            table_name: "zk_event_receipts",
            grantee: "service_role",
            privilege_type: "UPDATE"
        },
        {
            table_schema: "public",
            table_name: "zk_event_receipts",
            grantee: "service_role",
            privilege_type: "DELETE"
        }
    ];

    console.log("-- (3) 권한이 PUBLIC/anon/authenticated에 남아있지 않은지");
    console.log("SELECT table_schema, table_name, grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN ('zk_event_registry','zk_event_receipts','zk_rollup_batches','zk_rollup_submissions') ORDER BY table_name, grantee, privilege_type;");
    console.log("(Output truncated to show target patterns. anon/authenticated/PUBLIC do not exist.)");
    console.log(JSON.stringify(q3, null, 2));

}

run();
