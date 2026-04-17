/**
 * migrate-to-supabase.ts
 * 
 * Imports the SQLite export (sqlite-export.json) into Supabase Postgres.
 * Run ONCE after drizzle-kit push has created the tables.
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/migrate-to-supabase.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync } from "fs";
import {
  candidates, jobs, opportunities, campaigns, activities,
  interviews, placements, commissionSplits, invoices, settings,
} from "../shared/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set");
  process.exit(1);
}

const client = postgres(DATABASE_URL, { max: 5 });
const db = drizzle(client);

// camelCase helper — SQLite exports snake_case column names, Drizzle insert expects camelCase
function snakeToCamel(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

async function main() {
  console.log("📦 Loading sqlite-export.json…");
  const raw = JSON.parse(readFileSync("sqlite-export.json", "utf8"));

  // Candidates (largest table — 519 rows)
  const cands = raw.candidates as any[];
  if (cands.length > 0) {
    console.log(`⬆  Inserting ${cands.length} candidates…`);
    // Insert in batches of 50
    for (let i = 0; i < cands.length; i += 50) {
      const batch = cands.slice(i, i + 50).map(snakeToCamel);
      await db.insert(candidates).values(batch).onConflictDoNothing();
    }
    console.log("   ✓ candidates done");
  }

  // Jobs
  const jobsData = raw.jobs as any[];
  if (jobsData.length > 0) {
    console.log(`⬆  Inserting ${jobsData.length} jobs…`);
    for (let i = 0; i < jobsData.length; i += 50) {
      const batch = jobsData.slice(i, i + 50).map(snakeToCamel);
      await db.insert(jobs).values(batch).onConflictDoNothing();
    }
    console.log("   ✓ jobs done");
  }

  // Opportunities
  const opps = raw.opportunities as any[];
  if (opps.length > 0) {
    console.log(`⬆  Inserting ${opps.length} opportunities…`);
    await db.insert(opportunities).values(opps.map(snakeToCamel)).onConflictDoNothing();
    console.log("   ✓ opportunities done");
  }

  // Campaigns
  const camps = raw.campaigns as any[];
  if (camps.length > 0) {
    console.log(`⬆  Inserting ${camps.length} campaigns…`);
    await db.insert(campaigns).values(camps.map(snakeToCamel)).onConflictDoNothing();
    console.log("   ✓ campaigns done");
  }

  // Activities
  const acts = raw.activities as any[];
  if (acts.length > 0) {
    console.log(`⬆  Inserting ${acts.length} activities…`);
    await db.insert(activities).values(acts.map(snakeToCamel)).onConflictDoNothing();
    console.log("   ✓ activities done");
  }

  // Interviews
  const ivs = raw.interviews as any[];
  if (ivs.length > 0) {
    console.log(`⬆  Inserting ${ivs.length} interviews…`);
    await db.insert(interviews).values(ivs.map(snakeToCamel)).onConflictDoNothing();
    console.log("   ✓ interviews done");
  }

  // Placements
  const pls = raw.placements as any[];
  if (pls.length > 0) {
    console.log(`⬆  Inserting ${pls.length} placements…`);
    await db.insert(placements).values(pls.map(snakeToCamel)).onConflictDoNothing();
    console.log("   ✓ placements done");
  }

  // Commission splits
  const splits = raw.commission_splits as any[];
  if (splits.length > 0) {
    console.log(`⬆  Inserting ${splits.length} commission splits…`);
    await db.insert(commissionSplits).values(splits.map(snakeToCamel)).onConflictDoNothing();
    console.log("   ✓ commission_splits done");
  }

  // Invoices
  const invs = raw.invoices as any[];
  if (invs.length > 0) {
    console.log(`⬆  Inserting ${invs.length} invoices…`);
    await db.insert(invoices).values(invs.map(snakeToCamel)).onConflictDoNothing();
    console.log("   ✓ invoices done");
  }

  // Settings
  const setts = raw.settings as any[];
  if (setts.length > 0) {
    console.log(`⬆  Inserting ${setts.length} settings…`);
    for (const s of setts) {
      await db.insert(settings).values({ key: s.key, value: s.value }).onConflictDoNothing();
    }
    console.log("   ✓ settings done");
  }

  console.log("\n✅  Migration complete! All data is now in Supabase.");
  await client.end();
}

main().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
