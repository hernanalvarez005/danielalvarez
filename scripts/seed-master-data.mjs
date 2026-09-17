// Seeds a reasonable starting catalog for an existing organization: one
// campaign and a handful of crops. Idempotent -- safe to run more than
// once, it reuses rows that already exist by name.
//
// Requires SUPABASE_SERVICE_ROLE_KEY (server-only, never in Vercel):
//
//   node --env-file=.env.local scripts/seed-master-data.mjs
//
// Optional env override: SEED_ORG_NAME (defaults to "Organización Demo" --
// the same org scripts/seed-admin.mjs creates).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env.local.");
  process.exit(1);
}

const orgName = process.env.SEED_ORG_NAME ?? "Organización Demo";
const CAMPAIGN_NAME = "2026/27";
const CROPS = ["Soja", "Maíz", "Trigo", "Girasol", "Cebada", "Barbecho"];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("name", orgName)
    .maybeSingle();
  if (orgError) throw orgError;
  if (!org) {
    console.error(
      `No existe una organización llamada "${orgName}". Corré scripts/seed-admin.mjs primero, o pasá SEED_ORG_NAME.`,
    );
    process.exit(1);
  }
  console.log(`Using organization "${org.name}" (${org.id})`);

  const { data: existingCampaign, error: campaignSelectError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("organization_id", org.id)
    .eq("name", CAMPAIGN_NAME)
    .maybeSingle();
  if (campaignSelectError) throw campaignSelectError;

  if (!existingCampaign) {
    const { error } = await supabase
      .from("campaigns")
      .insert({ organization_id: org.id, name: CAMPAIGN_NAME });
    if (error) throw error;
    console.log(`Created campaign "${CAMPAIGN_NAME}"`);
  } else {
    console.log(`Campaign "${CAMPAIGN_NAME}" already exists`);
  }

  const { data: existingCrops, error: cropsSelectError } = await supabase
    .from("crops")
    .select("name")
    .eq("organization_id", org.id);
  if (cropsSelectError) throw cropsSelectError;

  const existingNames = new Set((existingCrops ?? []).map((c) => c.name));
  const toCreate = CROPS.filter((name) => !existingNames.has(name));

  if (toCreate.length > 0) {
    const { error } = await supabase
      .from("crops")
      .insert(toCreate.map((name) => ({ organization_id: org.id, name })));
    if (error) throw error;
    console.log(`Created crops: ${toCreate.join(", ")}`);
  } else {
    console.log("All crops already exist");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
