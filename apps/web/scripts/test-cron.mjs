import { POST } from "./app/api/integrity/cron-weekly-commit/route.ts";
import { NextRequest } from "next/server";

process.env.ANCHOR_COMMIT_THRESHOLD = "0";

async function run() {
  const req = new NextRequest("http://localhost:3000/api/integrity/cron-weekly-commit", {
    method: "POST",
    headers: { "x-cron-secret": process.env.CRON_SECRET }
  });
  const res = await POST(req);
  console.log("Response:", await res.text());
}

run();
