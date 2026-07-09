import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.migration" });

const required = [
  "SHEPHERDWELL_SUPABASE_URL",
  "SHEPHERDWELL_SERVICE_ROLE_KEY",
  "SHEPHERDKIDS_SUPABASE_URL",
  "SHEPHERDKIDS_SERVICE_ROLE_KEY",
  "SOURCE_CHURCH_NAME",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
}

const source = createClient(
  process.env.SHEPHERDWELL_SUPABASE_URL,
  process.env.SHEPHERDWELL_SERVICE_ROLE_KEY
);

const dest = createClient(
  process.env.SHEPHERDKIDS_SUPABASE_URL,
  process.env.SHEPHERDKIDS_SERVICE_ROLE_KEY
);

const churchName = process.env.SOURCE_CHURCH_NAME;

function stripSystemFields(row) {
  const copy = { ...row };
  delete copy.created_by;
  delete copy.updated_by;
  return copy;
}

async function upsertTable(table, rows, conflict = "id") {
  if (!rows?.length) {
    console.log(`- ${table}: 0 rows`);
    return;
  }

  const { error } = await dest
    .from(table)
    .upsert(rows.map(stripSystemFields), { onConflict: conflict });

  if (error) {
    console.error(`❌ ${table} failed:`, error.message);
    throw error;
  }

  console.log(`✓ ${table}: ${rows.length} rows`);
}

async function main() {
  console.log(`Migrating ${churchName} from ShepherdWell to ShepherdKids...\n`);

  const { data: church, error: churchError } = await source
    .from("churches")
    .select("*")
    .ilike("name", churchName)
    .maybeSingle();

  if (churchError || !church) {
    throw new Error(churchError?.message ?? `Church not found: ${churchName}`);
  }

  console.log(`Found church: ${church.name}`);
  console.log(`Church ID: ${church.id}\n`);

  await upsertTable("churches", [church]);

  const churchId = church.id;

  const tables = [
    "church_users",
    "cm_checkin_rooms",
    "cm_visitor_families",
    "cm_visitor_children",
  ];

  for (const table of tables) {
    const { data, error } = await source
      .from(table)
      .select("*")
      .eq("church_id", churchId);

    if (error) {
      console.error(`❌ Could not read ${table}:`, error.message);
      throw error;
    }

    await upsertTable(table, data ?? []);
  }

  console.log("\nMigration complete.");
  console.log("Skipped attendance history, sessions, check-in records, printer settings, and faith history.");
}

main().catch(err => {
  console.error("\nMigration failed:");
  console.error(err);
  process.exit(1);
});